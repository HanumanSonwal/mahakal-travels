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

type Context = { params: Promise<{ id: string }> };
export async function PATCH(req: NextRequest, { params }: Context) {
  if (!isOwnerRequest(req)) return NextResponse.json({ error: 'Sign in as owner to edit vehicles.' }, { status: 401 });
  try {
    const body = await req.json();
    await connectDB(); const { id } = await params;
    if (typeof body.active === 'boolean') {
      const vehicle = await VehicleOption.findByIdAndUpdate(id, { $set: { active: body.active } }, { new: true });
      if (!vehicle) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
      return NextResponse.json(vehicle);
    }
    const parsed = readVehicle(body);
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const vehicle = await VehicleOption.findByIdAndUpdate(id, { $set: parsed.value }, { new: true, runValidators: true });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
    return NextResponse.json(vehicle);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update vehicle.' }, { status: 400 }); }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  if (!isOwnerRequest(req)) return NextResponse.json({ error: 'Sign in as owner to remove vehicles.' }, { status: 401 });
  try {
    await connectDB(); const { id } = await params;
    const vehicle = await VehicleOption.findByIdAndUpdate(id, { $set: { active: false } }, { new: true });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 });
    return NextResponse.json({ vehicle });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not remove vehicle.' }, { status: 400 }); }
}
