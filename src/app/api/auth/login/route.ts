import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from '@/lib/auth';
import { User } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    await connectDB();
    const user = await User.findOne({ email, $or: [{ role: 'admin' }, { accountKey: 'owner' }] });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    const response = NextResponse.json({ user: { name: user.name, email: user.email } });
    response.cookies.set(SESSION_COOKIE, createSessionToken({ id: user.id, name: user.name, email: user.email }, 'admin'), sessionCookieOptions());
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not sign in.' }, { status: 503 }); }
}
