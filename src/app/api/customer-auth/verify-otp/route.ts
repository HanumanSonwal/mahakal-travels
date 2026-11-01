import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, hashCustomerOtp, hashPassword, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { CustomerOtp, User } from '@/lib/models';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MAX_ATTEMPTS = 5;

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Enter your email and verification code.' }, { status: 400 });
  }

  const email = String(body?.email || '').trim().toLowerCase();
  const code = String(body.code || '').trim();
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter a valid email and 6-digit code.' }, { status: 400 });
  }

  try {
    await connectDB();
    const otp = await CustomerOtp.findOne({ email });
    if (!otp || otp.codeExpiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 });
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 429 });
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const supplied = Buffer.from(hashCustomerOtp(email, code), 'hex');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      otp.attempts += 1;
      await otp.save();
      return NextResponse.json({ error: 'That code is incorrect. Check it and try again.' }, { status: 401 });
    }

    let user = await User.findOne({ email });
    if (user && user.role !== 'customer') {
      otp.codeHash = hashCustomerOtp(email, randomBytes(32).toString('hex'));
      otp.codeExpiresAt = new Date(0);
      otp.attempts = MAX_ATTEMPTS;
      await otp.save();
      return NextResponse.json({ error: 'This email cannot be used for a customer account.' }, { status: 403 });
    }
    if (!user) {
      const localPart = email.split('@')[0];
      const name = localPart.replace(/[._+-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Customer';
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

    otp.codeHash = hashCustomerOtp(email, randomBytes(32).toString('hex'));
    otp.codeExpiresAt = new Date(0);
    otp.attempts = MAX_ATTEMPTS;
    await otp.save();
    const response = NextResponse.json({
      user: { name: user.name, email: user.email, phone: user.phone || '' },
    });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken({ id: user.id, name: user.name, email: user.email }, 'customer'),
      sessionCookieOptions(),
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify your code.' },
      { status: 503 },
    );
  }
}
