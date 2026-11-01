import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { indiaDateTime } from '@/lib/booking';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { FullDayBooking, VehicleOption } from '@/lib/models';

export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role !== 'customer') return NextResponse.json({ error: 'Sign in to view your requests.' }, { status: 401 });
  try {
    await connectDB();
    const requests = await FullDayBooking.find({ customerId: session.sub }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load your requests.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role !== 'customer') return NextResponse.json({ error: 'Sign in to request a full-day booking.' }, { status: 401 });
  try {
    const body = await req.json();
    const date = String(body.date || ''), pickupLocation = String(body.pickupLocation || '').trim();
    const destination = String(body.destination || '').trim(), pickupTime = String(body.pickupTime || '');
    const customerName = String(body.customerName || '').trim();
    const phone = String(body.phone || '').trim(), passengers = Number(body.passengers), vehicleId = String(body.vehicleId || '');
    const estimatedKm = Number(body.estimatedKm);
    const notes = String(body.notes || '').trim().slice(0, 500);
    const today = indiaDateTime().date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return NextResponse.json({ error: 'Choose today or a future date.' }, { status: 400 });
    if (customerName.length < 2 || customerName.length > 100) return NextResponse.json({ error: 'Enter a customer name between 2 and 100 characters.' }, { status: 400 });
    if (pickupLocation.length < 2 || destination.length < 2) return NextResponse.json({ error: 'Enter your pickup location and destination.' }, { status: 400 });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)) return NextResponse.json({ error: 'Enter a valid pickup time.' }, { status: 400 });
    if (phone.replace(/\D/g, '').length < 7 || phone.length > 20) return NextResponse.json({ error: 'Enter a valid mobile number.' }, { status: 400 });
    if (!vehicleId) return NextResponse.json({ error: 'Choose an available vehicle.' }, { status: 400 });
    if (!Number.isFinite(estimatedKm) || estimatedKm < 0 || estimatedKm > 5000) return NextResponse.json({ error: 'Enter a valid kilometre estimate.' }, { status: 400 });

    await connectDB();
    const vehicle = await VehicleOption.findOne({ _id: vehicleId, active: true }).lean<{ _id: import('mongoose').Types.ObjectId; name: string; seatCapacity: number; pricePerKm: number; minimumKmPerDay: number }>();
    if (!vehicle) return NextResponse.json({ error: 'That vehicle is no longer available. Refresh and choose another.' }, { status: 409 });
    if (!Number.isInteger(passengers) || passengers < 1 || passengers > vehicle.seatCapacity) return NextResponse.json({ error: `Passenger count must be between 1 and ${vehicle.seatCapacity} for this vehicle.` }, { status: 400 });
    if (estimatedKm < vehicle.minimumKmPerDay) return NextResponse.json({ error: `Estimated distance must be at least ${vehicle.minimumKmPerDay} km for this vehicle.` }, { status: 400 });
    const unavailable = await FullDayBooking.exists({ vehicleOption: vehicle._id, date, status: { $in: ['REQUESTED', 'CONFIRMED'] } });
    if (unavailable) return NextResponse.json({ error: 'That vehicle is no longer available for this date. Refresh and choose another.' }, { status: 409 });
    const estimatedFare = estimatedKm * vehicle.pricePerKm;
    const request = await FullDayBooking.create({
      requestCode: `FD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      customerId: session.sub, vehicleOption: vehicle._id, vehicleName: vehicle.name, vehicleSeatCapacity: vehicle.seatCapacity, vehiclePricePerKm: vehicle.pricePerKm, minimumKmPerDay: vehicle.minimumKmPerDay,
      estimatedKm, estimatedToll: 0, estimatedParking: 0, estimatedFare,
      customerName, email: session.email, phone, date,
      pickupLocation, destination, pickupTime, passengers, notes
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not submit your request.' }, { status: 503 });
  }
}
