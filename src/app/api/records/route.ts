import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DailyRecord } from '@/lib/models';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)?.role !== 'admin') return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try { await connectDB(); const q=req.nextUrl.searchParams; const filter: Record<string,unknown>={}; if(q.get('from')||q.get('to')) filter.date={...(q.get('from')?{$gte:q.get('from')}:{}),...(q.get('to')?{$lte:q.get('to')}:{})}; if(q.get('month')) filter.date={ $gte:`${q.get('month')}-01`, $lte:`${q.get('month')}-31` }; const records=await DailyRecord.find(filter).sort({date:-1}).lean(); return NextResponse.json(records); }
  catch(e) { return NextResponse.json({error:e instanceof Error?e.message:'Could not load records'}, {status:500}); }
}
export async function POST(req: NextRequest) {
  if (verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)?.role !== 'admin') return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try { const body=await req.json(); if(!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||!['Completed Trip','No Trip','Holiday'].includes(body.status)) return NextResponse.json({error:'A valid date and day status are required.'},{status:400}); for(const k of ['collection','cng','toll','parking','food','maintenance','other']) if(!Number.isFinite(Number(body[k]))||Number(body[k])<0) return NextResponse.json({error:`${k} must be a non-negative amount.`},{status:400}); await connectDB(); const record=await DailyRecord.findOneAndUpdate({date:body.date},body,{upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true}); return NextResponse.json(record); }
  catch(e) { return NextResponse.json({error:e instanceof Error&&e.message.includes('E11000')?'A record already exists for that date.':e instanceof Error?e.message:'Could not save record'}, {status:500}); }
}
