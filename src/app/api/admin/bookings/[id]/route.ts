import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { isOwnerRequest } from '@/lib/booking';
import { Booking, Trip } from '@/lib/models';
type Context={params:Promise<{id:string}>};

export async function PATCH(req:NextRequest,{params}:Context){if(!isOwnerRequest(req))return NextResponse.json({error:'Sign in as owner to update bookings.'},{status:401});try{await connectDB();const {id}=await params;const booking=await Booking.findOneAndUpdate({_id:id,status:'CONFIRMED'},{$set:{status:'CANCELLED'}},{new:true});if(!booking)return NextResponse.json({error:'Confirmed booking not found.'},{status:404});const trip=await Trip.findById(booking.trip);if(trip){trip.availableSeats=Math.min(trip.totalSeats,trip.availableSeats+booking.seats);if(trip.status!=='CANCELLED')trip.status='OPEN';await trip.save()}return NextResponse.json({ok:true})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not cancel booking.'},{status:400})}}
