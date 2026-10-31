import { NextRequest,NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SESSION_COOKIE,verifySessionToken } from '@/lib/auth';
import { Booking } from '@/lib/models';

export async function GET(req:NextRequest){const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(session?.role!=='customer')return NextResponse.json({error:'Sign in to view your bookings.'},{status:401});try{await connectDB();const bookings=await Booking.find({customerId:session.sub}).sort({createdAt:-1}).populate('trip','origin destination tripType date departureTime arrivalTime returnDate returnDepartureTime returnArrivalTime status').lean();return NextResponse.json(bookings)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load your bookings.'},{status:503})}}
