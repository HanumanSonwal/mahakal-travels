import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

export async function GET(req:NextRequest){try{const session=verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);if(session?.role!=='customer')return NextResponse.json({user:null});await connectDB();const user=await User.findById(session.sub).select('name email phone role').lean<{name:string;email:string;phone:string;role:string}>();if(!user||user.role!=='customer')return NextResponse.json({user:null});return NextResponse.json({user:{name:user.name,email:user.email,phone:user.phone||''}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load your account.'},{status:503})}}
