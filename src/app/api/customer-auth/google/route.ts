import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthConfig, safeCustomerNextPath } from '@/lib/google-auth';

const COOKIE_PATH = '/api/customer-auth/google';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: COOKIE_PATH,
  maxAge: 10 * 60,
};

export async function GET(req: NextRequest) {
  try {
    const { client, redirectUri } = getGoogleOAuthConfig();
    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(32).toString('hex');
    const authorizationUrl = client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      nonce,
      prompt: 'select_account',
      redirect_uri: redirectUri,
    });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set('customer_google_state', state, cookieOptions);
    response.cookies.set('customer_google_nonce', nonce, cookieOptions);
    response.cookies.set('customer_google_next', Buffer.from(safeCustomerNextPath(req.nextUrl.searchParams.get('next'))).toString('base64url'), cookieOptions);
    return response;
  } catch (error) {
    const destination = new URL('/account?google_error=configuration', req.url);
    const response = NextResponse.redirect(destination);
    response.cookies.delete('customer_google_state');
    response.cookies.delete('customer_google_nonce');
    response.cookies.delete('customer_google_next');
    if (error instanceof Error) console.error('Could not start Google sign-in:', error.message);
    return response;
  }
}
