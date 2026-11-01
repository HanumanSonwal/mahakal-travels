import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { FullDayBooking, VehicleOption } from '@/lib/models';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') || '';
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Enter a valid date.' }, { status: 400 });
  try {
    await connectDB();
    const bookedIds = date ? await FullDayBooking.distinct('vehicleOption', { date, status: { $in: ['REQUESTED', 'CONFIRMED'] } }) : [];
    const vehicles = await VehicleOption.find({ active: true, ...(bookedIds.length ? { _id: { $nin: bookedIds } } : {}) }).sort({ name: 1 }).select('name seatCapacity pricePerKm minimumKmPerDay').lean();
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load vehicles.' }, { status: 503 });
  }
}
