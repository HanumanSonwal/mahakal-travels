import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isOwnerRequest } from '@/lib/booking';
import { Booking } from '@/lib/models';

export async function GET(req:NextRequest){if(!isOwnerRequest(req))return NextResponse.json({error:'Sign in as owner to view bookings.'},{status:401});try{await connectDB();const bookings=await Booking.find().sort({createdAt:-1}).populate('trip','origin destination tripType date departureTime arrivalTime returnDate returnDepartureTime returnArrivalTime').lean();return NextResponse.json(bookings)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load bookings.'},{status:503})}}
