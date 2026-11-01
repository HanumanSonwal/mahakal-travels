'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CarFront, Clock3, Users } from 'lucide-react';
import { formatTime12h } from '@/lib/time';
import { money } from '@/lib/finance';

type FullDayRequest = { _id: string; requestCode: string; date: string; pickupLocation: string; destination: string; pickupTime: string; passengers: number; vehicleName: string; vehiclePricePerKm: number; minimumKmPerDay: number; estimatedKm: number; estimatedToll: number; estimatedParking: number; estimatedFare: number; quotedFare: number | null; vehicleNumber: string; driverPhone: string; status: 'REQUESTED' | 'CONFIRMED' | 'DECLINED' };
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function CustomerFullDayRequests() {
  const [requests, setRequests] = useState<FullDayRequest[]>([]);
  useEffect(() => { fetch('/api/full-day-bookings').then(res => res.ok ? res.json() : []).then(setRequests).catch(() => {}); }, []);
  if (!requests.length) return null;
  return <section className="full-day-account-section"><div className="customer-section-head"><div><h2>Full-day vehicle requests</h2><p>Track the operator’s response to your full-day booking request.</p></div></div><div className="customer-booking-list">{requests.map(request => <article className="customer-booking-card full-day-request-card" key={request._id}><div className="customer-booking-top"><span className="booking-reference-label"><CarFront size={14}/>{request.requestCode}</span><span className={`full-day-status ${request.status.toLowerCase()}`}>{request.status === 'REQUESTED' ? 'Awaiting confirmation' : request.status}</span></div><div className="full-day-request-route"><b>{request.pickupLocation}</b><span>to</span><b>{request.destination}</b></div><div className="customer-booking-meta"><span><CarFront size={14}/>{request.vehicleName} · {money(request.vehiclePricePerKm)}/km</span><span><CalendarDays size={14}/>{dateLabel(request.date)}</span><span><Clock3 size={14}/>{formatTime12h(request.pickupTime)} pickup</span><span><Users size={14}/>{request.passengers} passengers</span></div>{request.status === 'CONFIRMED' && <div className="full-day-customer-assignment"><span>Vehicle number <b>{request.vehicleNumber}</b></span><span>Driver phone <a href={`tel:${request.driverPhone}`}>{request.driverPhone}</a></span></div>}<div className="full-day-account-costs"><span>{Math.max(request.estimatedKm, request.minimumKmPerDay)} billable km</span><span>Toll & parking extra at actuals</span><b>{request.status === 'CONFIRMED' && request.quotedFare !== null ? `Confirmed fare: ${money(request.quotedFare)}` : `Estimate (excluding toll & parking): ${money(request.estimatedFare)}`}</b></div></article>)}</div></section>;
}
