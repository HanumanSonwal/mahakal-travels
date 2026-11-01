import { randomBytes, randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashCustomerOtp } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { sendCustomerLoginCode } from '@/lib/email';
import { CustomerOtp } from '@/lib/models';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RESEND_DELAY_MS = 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const email = String(body?.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  try {
    await connectDB();
    const now = new Date();
    let otp = await CustomerOtp.findOne({ email });
    if (otp && now.getTime() - otp.lastSentAt.getTime() < RESEND_DELAY_MS) {
      return NextResponse.json({ error: 'Please wait a minute before requesting another code.' }, { status: 429 });
    }

    const withinWindow = otp && now.getTime() - otp.windowStartedAt.getTime() < SEND_WINDOW_MS;
    if (withinWindow && otp.sendsInWindow >= MAX_SENDS_PER_WINDOW) {
      return NextResponse.json({ error: 'Too many codes requested. Try again in an hour.' }, { status: 429 });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = hashCustomerOtp(email, code);
    if (otp) {
      otp.codeHash = codeHash;
      otp.codeExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
      otp.attempts = 0;
      otp.lastSentAt = now;
      otp.sendsInWindow = withinWindow ? otp.sendsInWindow + 1 : 1;
      if (!withinWindow) otp.windowStartedAt = now;
      otp.expiresAt = new Date(otp.windowStartedAt.getTime() + SEND_WINDOW_MS);
    } else {
      otp = new CustomerOtp({
        email,
        codeHash,
        codeExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
        expiresAt: new Date(now.getTime() + SEND_WINDOW_MS),
        attempts: 0,
        lastSentAt: now,
        windowStartedAt: now,
        sendsInWindow: 1,
      });
    }
    await otp.save();

    try {
      await sendCustomerLoginCode(email, code);
    } catch (error) {
      otp.codeHash = hashCustomerOtp(email, randomBytes(32).toString('hex'));
      otp.codeExpiresAt = new Date(0);
      otp.attempts = MAX_SENDS_PER_WINDOW;
      await otp.save();
      throw error;
    }

    return NextResponse.json({ message: 'A verification code has been sent to your email.' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send a verification code.' },
      { status: 503 },
    );
  }
}
