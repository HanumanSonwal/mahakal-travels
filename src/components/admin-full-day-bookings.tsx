'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, LoaderCircle, Users, X } from 'lucide-react';
import { formatTime12h } from '@/lib/time';
import { money } from '@/lib/finance';
import { cleanDecimalInput } from '@/lib/numeric-input';

type Request = { _id: string; requestCode: string; customerName: string; phone: string; email: string; date: string; pickupLocation: string; destination: string; pickupTime: string; passengers: number; notes: string; vehicleName: string; vehiclePricePerKm: number; minimumKmPerDay: number; estimatedKm: number; estimatedToll: number; estimatedParking: number; estimatedFare: number; quotedFare: number | null; status: 'REQUESTED' | 'CONFIRMED' | 'DECLINED' };
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const parse = async (res: Response) => { const text = await res.text(); try { return JSON.parse(text); } catch { return { error: 'Invalid server response.' }; } };

export default function AdminFullDayBookings() {
  const [requests, setRequests] = useState<Request[]>([]), [fare, setFare] = useState<Record<string, string>>({}), [loading, setLoading] = useState(true), [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = async () => { setLoading(true); try { const res = await fetch('/api/admin/full-day-bookings'); const data = await parse(res); if (!res.ok) throw new Error(data.error); setRequests(data); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load requests.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const update = async (request: Request, status: 'CONFIRMED' | 'DECLINED') => {
    setBusy(request._id); setError(''); setNotice('');
    try {
      const res = await fetch(`/api/admin/full-day-bookings/${request._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, quotedFare: fare[request._id] ?? request.estimatedFare }) });
      const data = await parse(res); if (!res.ok) throw new Error(data.error);
      setRequests(items => items.map(item => item._id === request._id ? data.request : item));
      setNotice(status === 'CONFIRMED' ? 'Booking confirmed with the quoted fare.' : 'Request declined.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update request.'); }
    finally { setBusy(''); }
  };
  if (loading) return <div className="trip-loading"><LoaderCircle className="spin" size={18}/>Loading full-day requests…</div>;
  return <div className="full-day-admin-list">
    {error && <div className="notice">{error}<button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="auth-success">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    {requests.length ? requests.map(request => <article className="full-day-admin-card" key={request._id}>
      <div className="full-day-admin-main"><div className="customer-booking-top"><span className="booking-reference-label">{request.requestCode}</span><span className={`full-day-status ${request.status.toLowerCase()}`}>{request.status}</span></div>
        <h3>{request.pickupLocation} <span>to</span> {request.destination}</h3>
        <div className="full-day-admin-details"><span><CalendarDays size={14}/>{dateLabel(request.date)}</span><span><Clock3 size={14}/>{formatTime12h(request.pickupTime)} pickup</span><span><Users size={14}/>{request.passengers} passengers</span></div>
        <div className="full-day-admin-vehicle">{request.vehicleName} · {money(request.vehiclePricePerKm)}/km · {request.minimumKmPerDay} km minimum/day</div>
        <div className="full-day-admin-costs"><span>{Math.max(request.estimatedKm, request.minimumKmPerDay)} billable km × {money(request.vehiclePricePerKm)} = <b>{money(Math.max(request.estimatedKm, request.minimumKmPerDay) * request.vehiclePricePerKm)}</b></span><span>Toll & parking extra at actuals</span><strong>Customer estimate (excluding toll & parking): {money(request.estimatedFare)}</strong></div>
        <div className="full-day-admin-contact"><b>{request.customerName}</b><a href={`tel:${request.phone}`}>{request.phone}</a>{request.email && <a href={`mailto:${request.email}`}>{request.email}</a>}</div>
        {request.notes && <p className="full-day-admin-notes">{request.notes}</p>}
        {request.status === 'CONFIRMED' && request.quotedFare !== null && <div className="full-day-admin-quote">Confirmed fare <b>{money(request.quotedFare)}</b></div>}
      </div>
      {request.status === 'REQUESTED' && <div className="full-day-admin-actions"><label>Final fare (₹)<input type="text" inputMode="decimal" value={fare[request._id] ?? String(request.estimatedFare)} onChange={event => setFare(current => ({ ...current, [request._id]: cleanDecimalInput(event.target.value) }))} placeholder="Enter quote"/></label><small className="full-day-suggested-fare">Customer estimate: {money(request.estimatedFare)}</small><button className="primary-btn" disabled={busy === request._id} onClick={() => update(request, 'CONFIRMED')}>{busy === request._id ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>}Confirm booking</button><button className="small-action danger" disabled={busy === request._id} onClick={() => update(request, 'DECLINED')}><X size={14}/>Decline</button></div>}
    </article>) : <div className="admin-empty"><CalendarDays size={24}/><b>No full-day requests yet</b><span>Customer requests for a full-day vehicle will appear here.</span></div>}
  </div>;
}
