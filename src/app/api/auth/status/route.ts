import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { User } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
    const user = session?.role === 'admin' ? await User.findById(session.sub).select('name email').lean<{ name: string; email: string }>() : null;
    const setupRequired = !(await User.exists({ accountKey: 'owner' }));
    return NextResponse.json({ setupRequired, user: user ? { name: user.name, email: user.email } : null });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Authentication service unavailable.' }, { status: 503 }); }
}
