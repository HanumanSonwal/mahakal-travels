import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isOwnerRequest } from '@/lib/booking';
import { VehicleOption } from '@/lib/models';

function readVehicle(body: Record<string, unknown>) {
  const name = String(body.name || '').trim();
  const seatCapacity = Number(body.seatCapacity), pricePerKm = Number(body.pricePerKm), minimumKmPerDay = Number(body.minimumKmPerDay);
  if (name.length < 2 || name.length > 80) return { error: 'Vehicle name must be between 2 and 80 characters.' };
  if (!Number.isInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 50) return { error: 'Seat capacity must be between 1 and 50.' };
  if (!Number.isFinite(pricePerKm) || pricePerKm < 0) return { error: 'Enter a valid price per kilometre.' };
  if (!Number.isInteger(minimumKmPerDay) || minimumKmPerDay < 1 || minimumKmPerDay > 5000) return { error: 'Minimum kilometres per day must be between 1 and 5000.' };
  return { value: { name, seatCapacity, pricePerKm, minimumKmPerDay } };
}

export async function GET(req: NextRequest) {
  if (!isOwnerRequest(req)) return NextResponse.json({ error: 'Sign in as owner to manage vehicles.' }, { status: 401 });
  try { await connectDB(); return NextResponse.json(await VehicleOption.find().sort({ active: -1, name: 1 }).lean()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load vehicles.' }, { status: 503 }); }
}

export async function POST(req: NextRequest) {
  if (!isOwnerRequest(req)) return NextResponse.json({ error: 'Sign in as owner to add vehicles.' }, { status: 401 });
  try {
    const parsed = readVehicle(await req.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await connectDB();
    return NextResponse.json(await VehicleOption.create(parsed.value), { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not add vehicle.' }, { status: 400 }); }
}
