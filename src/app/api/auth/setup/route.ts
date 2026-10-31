import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { User } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) return NextResponse.json({ error: 'Enter a name, valid email, and password with at least 10 characters.' }, { status: 400 });
    await connectDB();
    if (await User.exists({ accountKey: 'owner' })) return NextResponse.json({ error: 'Owner account is already set up. Please sign in.' }, { status: 409 });
    const user = await User.create({ name, email, passwordHash: await hashPassword(password), role: 'admin', accountKey: 'owner' });
    const response = NextResponse.json({ user: { name: user.name, email: user.email } }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, createSessionToken({ id: user.id, name: user.name, email: user.email }, 'admin'), sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error && error.message.includes('E11000') ? 'Owner account is already set up. Please sign in.' : error instanceof Error ? error.message : 'Could not create the owner account.';
    return NextResponse.json({ error: message }, { status: message.includes('already set up') ? 409 : 503 });
  }
}
