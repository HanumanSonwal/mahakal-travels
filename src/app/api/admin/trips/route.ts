import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isOwnerRequest, validTripInput } from '@/lib/booking';
import { Booking, Trip } from '@/lib/models';

export async function GET(req:NextRequest){if(!isOwnerRequest(req))return NextResponse.json({error:'Sign in as owner to manage trips.'},{status:401});try{await connectDB();const trips=await Trip.find().sort({date:-1,departureTime:1}).lean();const counts=await Booking.aggregate([{$match:{status:'CONFIRMED'}},{$group:{_id:'$trip',bookings:{$sum:1},seats:{$sum:'$seats'}}}]);const byId=new Map(counts.map(x=>[String(x._id),{bookings:x.bookings,seats:x.seats}]));return NextResponse.json(trips.map(t=>({...t,confirmedBookings:byId.get(String(t._id))?.bookings||0,seatsBooked:byId.get(String(t._id))?.seats||0})))}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load trips.'},{status:503})}}

export async function POST(req:NextRequest){if(!isOwnerRequest(req))return NextResponse.json({error:'Sign in as owner to create trips.'},{status:401});try{const body=await req.json();const parsed=validTripInput(body);if(!parsed.ok)return NextResponse.json({error:parsed.error},{status:400});await connectDB();const trip=await Trip.create({...parsed.value,availableSeats:parsed.value.totalSeats,status:'OPEN'});return NextResponse.json(trip,{status:201})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not create trip.'},{status:400})}}
