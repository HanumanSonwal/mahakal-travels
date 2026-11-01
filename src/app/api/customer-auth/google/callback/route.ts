import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getGoogleOAuthConfig, safeCustomerNextPath } from '@/lib/google-auth';
import { User } from '@/lib/models';

const COOKIE_PATH = '/api/customer-auth/google';
const GOOGLE_COOKIE_NAMES = ['customer_google_state', 'customer_google_nonce', 'customer_google_next'];

function clearGoogleCookies(response: NextResponse) {
  for (const name of GOOGLE_COOKIE_NAMES) {
    response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: COOKIE_PATH, maxAge: 0 });
  }
}

function accountRedirect(req: NextRequest, error?: string) {
  const response = NextResponse.redirect(new URL(error ? `/account?google_error=${error}` : '/account', req.url));
  clearGoogleCookies(response);
  return response;
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function constantTimeMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function GET(req: NextRequest) {
  const returnedState = req.nextUrl.searchParams.get('state') || '';
  const savedState = req.cookies.get('customer_google_state')?.value || '';
  const savedNonce = req.cookies.get('customer_google_nonce')?.value || '';
  if (!returnedState || !savedState || !savedNonce || !constantTimeMatch(returnedState, savedState)) {
    return accountRedirect(req, 'failed');
  }
  if (req.nextUrl.searchParams.has('error')) return accountRedirect(req, 'cancelled');

  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return accountRedirect(req, 'failed');

    const { client, clientId, redirectUri } = getGoogleOAuthConfig();
    const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
    if (!tokens.id_token) return accountRedirect(req, 'failed');

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const profile = ticket.getPayload();
    if (!profile || profile.nonce !== savedNonce || profile.email_verified !== true || !profile.email || !profile.name) {
      return accountRedirect(req, 'failed');
    }

    const email = profile.email.trim().toLowerCase();
    const name = profile.name.trim().slice(0, 80);
    if (!name || email.length > 254) return accountRedirect(req, 'failed');

    await connectDB();
    let user = await User.findOne({ email });
    if (user && user.role !== 'customer') return accountRedirect(req, 'account_type');

    if (!user) {
      try {
        user = await User.create({
          name,
          email,
          phone: '',
          passwordHash: await hashPassword(randomBytes(32).toString('base64url')),
          role: 'customer',
          accountKey: `customer:${email}`,
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        user = await User.findOne({ email, role: 'customer' });
        if (!user) throw error;
      }
    }

    user.name = name;
    await user.save();

    const response = NextResponse.redirect(new URL(
      safeCustomerNextPath(Buffer.from(req.cookies.get('customer_google_next')?.value || '', 'base64url').toString('utf8')),
      req.url,
    ));
    clearGoogleCookies(response);
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken({ id: user.id, name: user.name, email: user.email }, 'customer'),
      sessionCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error('Google customer sign-in failed:', error);
    return accountRedirect(req, 'failed');
  }
}
