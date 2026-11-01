import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isOwnerRequest } from '@/lib/booking';
import { FullDayBooking } from '@/lib/models';

export async function GET(req: NextRequest) {
  if (!isOwnerRequest(req)) return NextResponse.json({ error: 'Sign in as owner to view full-day requests.' }, { status: 401 });
  try {
    await connectDB();
    const requests = await FullDayBooking.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load full-day requests.' }, { status: 503 });
  }
}
