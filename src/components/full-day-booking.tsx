'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CarFront, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { money } from '@/lib/finance';
import { cleanDecimalInput } from '@/lib/numeric-input';

type VehicleOption = { _id: string; name: string; seatCapacity: number; pricePerKm: number; minimumKmPerDay: number };
type FullDayForm = { date: string; vehicleId: string; customerName: string; pickupLocation: string; destination: string; pickupTime: string; passengers: number; estimatedKm: string; phone: string; notes: string };
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const parse = async (res: Response) => { const text = await res.text(); try { return JSON.parse(text); } catch { return { error: 'The server returned an invalid response.' }; } };

export default function FullDayBooking() {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [customer, setCustomer] = useState<{ name?: string; phone?: string } | null>(null);
  const [form, setForm] = useState<FullDayForm>({ date: today(), vehicleId: '', customerName: '', pickupLocation: '', destination: '', pickupTime: '08:00', passengers: 1, estimatedKm: '0', phone: '', notes: '' });
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]), [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [submitted, setSubmitted] = useState('');
  useEffect(() => { fetch('/api/customer-auth/status').then(parse).then(data => { if (data.user) { setCustomer(data.user); setForm(current => ({ ...current, customerName: data.user.name || '', phone: data.user.phone || '' })); } }).catch(() => {}); }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setVehiclesLoading(true);
    fetch(`/api/vehicles?date=${encodeURIComponent(form.date)}`, { signal: controller.signal }).then(parse).then(data => {
      if (Array.isArray(data)) {
        setVehicles(data);
        setForm(current => {
          const selected = data.find((vehicle: VehicleOption) => vehicle._id === current.vehicleId) || data[0];
          return { ...current, vehicleId: selected?._id || '', passengers: selected ? Math.min(current.passengers, selected.seatCapacity) : 1, estimatedKm: selected ? String(Math.max(Number(current.estimatedKm) || 0, selected.minimumKmPerDay)) : '0' };
        });
      } else { setVehicles([]); setError(data.error || 'Could not load available vehicles.'); }
    }).catch(error => { if (error.name !== 'AbortError') setError('Could not load available vehicles.'); }).finally(() => { if (!controller.signal.aborted) setVehiclesLoading(false); });
    return () => controller.abort();
  }, [open, form.date]);
  const selectedVehicle = vehicles.find(vehicle => vehicle._id === form.vehicleId);
  const billableKm = selectedVehicle ? Math.max(Number(form.estimatedKm) || 0, selectedVehicle.minimumKmPerDay) : 0;
  const kmFare = selectedVehicle ? billableKm * selectedVehicle.pricePerKm : 0;
  const distanceBelowMinimum = !!selectedVehicle && Number(form.estimatedKm) < selectedVehicle.minimumKmPerDay;
  const estimatedTotal = kmFare;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (distanceBelowMinimum) { setError(`Estimated distance must be at least ${selectedVehicle?.minimumKmPerDay} km for this vehicle.`); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/full-day-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, estimatedKm: Number(form.estimatedKm) || 0 }) });
      const data = await parse(res);
      if (!res.ok) {
        if (res.status === 401) { window.location.assign('/account?next=%2Fbook'); return; }
        throw new Error(data.error || 'Could not submit your request.');
      }
      setSubmitted(data.request.requestCode); setOpen(false);
      setForm(current => ({ ...current, pickupLocation: '', destination: '', notes: '' }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit your request.'); }
    finally { setBusy(false); }
  };

  return <>
    <section className="full-day-promo">
      <span className="full-day-icon"><CarFront size={21}/></span>
      <div className="full-day-copy"><span className="booking-kicker">NEED THE VEHICLE FOR THE DAY?</span><h2>Book a full-day ride</h2><p>Share your plans and we’ll confirm availability and the fare with you.</p></div>
      <button className="full-day-open" onClick={() => { if (!customer) { window.location.assign('/account?next=%2Fbook'); return; } setError(''); setOpen(true); }}>Request full-day booking <ArrowRight size={16}/></button>
    </section>
    {submitted && <div className="full-day-success"><CheckCircle2 size={17}/><span>Your request <b>{submitted}</b> is sent. We’ll contact you to confirm availability and fare.</span><button onClick={() => setSubmitted('')} aria-label="Dismiss"><X size={15}/></button></div>}
    {open && <div className="booking-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form className="booking-modal full-day-modal" onSubmit={submit}>
        <div className="booking-modal-head"><div><span className="booking-kicker">FULL-DAY VEHICLE BOOKING</span><h2><CarFront size={20}/> Request a vehicle</h2><p>Send your plan to the operator. They’ll confirm availability and fare.</p></div><button className="booking-close" type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={19}/></button></div>
        <div className="booking-form">
          <label>Travel date<input type="date" min={today()} value={form.date} onChange={e => setForm({ ...form, date: e.target.value, vehicleId: '' })} required/></label>
          <label>Available vehicle{vehiclesLoading && <span>Loading availability…</span>}<select value={form.vehicleId} onChange={e => { const vehicle = vehicles.find(option => option._id === e.target.value); setForm({ ...form, vehicleId: e.target.value, passengers: vehicle ? Math.min(form.passengers, vehicle.seatCapacity) : 1, estimatedKm: vehicle ? String(Math.max(Number(form.estimatedKm) || 0, vehicle.minimumKmPerDay)) : '0' }); }} required disabled={vehiclesLoading || vehicles.length === 0}><option value="">{vehiclesLoading ? 'Checking availability…' : vehicles.length ? 'Choose a vehicle' : 'No vehicles available on this date'}</option>{vehicles.map(vehicle => <option key={vehicle._id} value={vehicle._id}>{vehicle.name} · up to {vehicle.seatCapacity} seats · {money(vehicle.pricePerKm)}/km + toll & parking</option>)}</select></label>
          {selectedVehicle && <div className="full-day-vehicle-rate"><b>{selectedVehicle.name}</b><span>{selectedVehicle.seatCapacity} seats · {money(selectedVehicle.pricePerKm)} per km</span><small>Minimum {selectedVehicle.minimumKmPerDay} km/day · minimum estimate {money(selectedVehicle.minimumKmPerDay * selectedVehicle.pricePerKm)}</small></div>}
          <div className="full-day-fields"><label>Pickup location<input value={form.pickupLocation} onChange={e => setForm({ ...form, pickupLocation: e.target.value })} required minLength={2} maxLength={100} placeholder="Where should we pick you up?"/></label><label>Destination<input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} required minLength={2} maxLength={100} placeholder="Where are you going?"/></label></div>
          <div className="full-day-fields"><label>Pickup time<input type="time" value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} required/></label><label>Passengers<select value={form.passengers} onChange={e => setForm({ ...form, passengers: Number(e.target.value) })} disabled={!selectedVehicle}>{Array.from({ length: selectedVehicle?.seatCapacity || 0 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? 'passenger' : 'passengers'}</option>)}</select></label></div>
          <label>Estimated total distance (km)<input type="text" inputMode="decimal" value={form.estimatedKm} onChange={e => { setForm({ ...form, estimatedKm: cleanDecimalInput(e.target.value) }); setError(''); }} aria-invalid={distanceBelowMinimum} required/>{distanceBelowMinimum && <small className="full-day-field-error">Enter at least {selectedVehicle.minimumKmPerDay} km for this vehicle.</small>}</label>
          {selectedVehicle && <div className="full-day-estimate"><span>{billableKm} billable km × {money(selectedVehicle.pricePerKm)}<b>{money(kmFare)}</b></span><strong>Estimated total (excluding toll & parking)<b>{money(estimatedTotal)}</b></strong><small>Minimum {selectedVehicle.minimumKmPerDay} km/day applies. Toll and parking are extra at actuals; the owner confirms the final fare.</small></div>}
          <label>Customer name<input autoComplete="name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} required minLength={2} maxLength={100} placeholder="Name for this booking"/></label>
          <label>Mobile number<input autoComplete="tel" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required minLength={7} maxLength={20} placeholder="For booking confirmation"/></label>
          <label>Additional details <span>Optional</span><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={500} placeholder="Stops, return plan, luggage, or other requests"/></label>
          {error && <div className="booking-error">{error}</div>}
          <button className="confirm-booking-btn" disabled={busy || distanceBelowMinimum}>{busy ? <LoaderCircle size={17} className="spin"/> : <>Send request <ArrowRight size={16}/></>}</button>
          <small className="booking-terms">This is a request. The operator will confirm the fare and availability with you.</small>
        </div>
      </form>
    </div>}
  </>;
}
