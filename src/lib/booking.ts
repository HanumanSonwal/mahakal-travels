import { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export const isOwnerRequest = (req: NextRequest) => verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)?.role === 'admin';
export function indiaDateTime(date=new Date()) {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const part=(key:string)=>parts.find(x=>x.type===key)?.value||'00';
  return {date:`${part('year')}-${part('month')}-${part('day')}`,time:`${part('hour')}:${part('minute')}`};
}
type TripInput={origin:string;destination:string;tripType:'ONE_WAY'|'ROUND_TRIP';date:string;departureTime:string;arrivalTime:string;returnDate:string;returnDepartureTime:string;returnArrivalTime:string;farePerSeat:number;totalSeats:number;notes:string};
type TripValidation={ok:false;error:string}|{ok:true;value:TripInput};
export function validTripInput(body: Record<string, unknown>):TripValidation {
  const origin=String(body.origin||'').trim(),destination=String(body.destination||'').trim(),date=String(body.date||''),departureTime=String(body.departureTime||''),arrivalTime=String(body.arrivalTime||''),tripType=body.tripType==='ROUND_TRIP'?'ROUND_TRIP':'ONE_WAY',returnDate=String(body.returnDate||''),returnDepartureTime=String(body.returnDepartureTime||''),returnArrivalTime=String(body.returnArrivalTime||'');
  const farePerSeat=Number(body.farePerSeat),totalSeats=Number(body.totalSeats);
  if(origin.length<2||destination.length<2||origin.toLowerCase()===destination.toLowerCase())return {ok:false,error:'Enter different origin and destination places.'};
  const now=indiaDateTime();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<now.date||(date===now.date&&departureTime<=now.time))return {ok:false,error:'Trip date and departure time must be in the future.'};
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)||(arrivalTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime)))return {ok:false,error:'Enter a valid departure and arrival time.'};
  if(tripType==='ROUND_TRIP'&&(!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)||returnDate<date||!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnDepartureTime)||(returnArrivalTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(returnArrivalTime))))return {ok:false,error:'Enter a valid return date and departure time.'};
  if(tripType==='ROUND_TRIP'&&returnDate===date&&returnDepartureTime<=(arrivalTime||departureTime))return {ok:false,error:'Return departure must be after the outbound arrival time.'};
  if(!Number.isFinite(farePerSeat)||farePerSeat<0||!Number.isInteger(totalSeats)||totalSeats<1||totalSeats>100)return {ok:false,error:'Fare must be non-negative and seats must be between 1 and 100.'};
  return {ok:true,value:{origin,destination,tripType,date,departureTime,arrivalTime,returnDate:tripType==='ROUND_TRIP'?returnDate:'',returnDepartureTime:tripType==='ROUND_TRIP'?returnDepartureTime:'',returnArrivalTime:tripType==='ROUND_TRIP'?returnArrivalTime:'',farePerSeat,totalSeats,notes:String(body.notes||'').trim().slice(0,500)}};
}
