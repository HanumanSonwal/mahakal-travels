'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CarFront, Check, LoaderCircle, Pencil, Plus, RotateCcw, Trash2, Users, X } from 'lucide-react';
import { money } from '@/lib/finance';
import { cleanDecimalInput } from '@/lib/numeric-input';

type Vehicle = { _id: string; name: string; seatCapacity: number; pricePerKm: number; minimumKmPerDay: number; active: boolean };
type VehicleForm = { name: string; seatCapacity: number; pricePerKm: string; minimumKmPerDay: number };
const blank: VehicleForm = { name: '', seatCapacity: 7, pricePerKm: '', minimumKmPerDay: 100 };
const parse = async (res: Response) => { const text = await res.text(); try { return JSON.parse(text); } catch { return { error: 'Invalid server response.' }; } };

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]), [form, setForm] = useState<VehicleForm>(blank), [editing, setEditing] = useState(''), [showForm, setShowForm] = useState(false), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = async () => { setLoading(true); try { const res = await fetch('/api/admin/vehicles'); const data = await parse(res); if (!res.ok) throw new Error(data.error); setVehicles(data); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load vehicles.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const beginAdd = () => { setEditing(''); setForm(blank); setShowForm(true); setError(''); setNotice(''); };
  const beginEdit = (vehicle: Vehicle) => { setEditing(vehicle._id); setForm({ name: vehicle.name, seatCapacity: vehicle.seatCapacity, pricePerKm: String(vehicle.pricePerKm), minimumKmPerDay: vehicle.minimumKmPerDay }); setShowForm(true); setError(''); setNotice(''); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const res = await fetch(editing ? `/api/admin/vehicles/${editing}` : '/api/admin/vehicles', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, pricePerKm: Number(form.pricePerKm) }) });
      const data = await parse(res); if (!res.ok) throw new Error(data.error);
      setShowForm(false); setNotice(editing ? 'Vehicle details updated.' : 'Vehicle added to full-day options.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save vehicle.'); }
    finally { setSaving(false); }
  };
  const setActive = async (vehicle: Vehicle, active: boolean) => {
    setBusy(vehicle._id); setError(''); setNotice('');
    try { const res = await fetch(`/api/admin/vehicles/${vehicle._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }); const data = await parse(res); if (!res.ok) throw new Error(data.error); setVehicles(items => items.map(item => item._id === vehicle._id ? data : item)); setNotice(active ? 'Vehicle is available for booking.' : 'Vehicle removed from new booking options.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update vehicle.'); }
    finally { setBusy(''); }
  };
  return <div className="admin-vehicles-page">
    <div className="admin-vehicles-head"><div><h3>Full-day vehicle options</h3><p>Add vehicles and set their passenger capacity and daily kilometre rates.</p></div><button className="primary-btn" onClick={beginAdd}><Plus size={16}/>Add vehicle</button></div>
    {error && <div className="notice">{error}<button onClick={() => setError('')}>×</button></div>}{notice && <div className="auth-success">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    {showForm && <form className="admin-vehicle-form" onSubmit={submit}><div className="admin-vehicle-form-head"><b>{editing ? 'Edit vehicle' : 'Add a vehicle'}</b><button type="button" onClick={() => setShowForm(false)} aria-label="Close"><X size={16}/></button></div><div className="admin-vehicle-fields"><label>Vehicle name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="e.g. Suzuki Eeco" required/></label><label>Seat capacity<input type="number" min="1" max="50" step="1" value={form.seatCapacity} onChange={e => setForm({ ...form, seatCapacity: Number(e.target.value) })} required/></label><label>Price per km (₹)<input type="text" inputMode="decimal" value={form.pricePerKm} onChange={e => setForm({ ...form, pricePerKm: cleanDecimalInput(e.target.value) })} placeholder="Enter rate" required/></label><label>Minimum km per day<input type="number" min="1" max="5000" step="1" value={form.minimumKmPerDay} onChange={e => setForm({ ...form, minimumKmPerDay: Number(e.target.value) })} required/></label></div><div className="admin-vehicle-form-actions"><small>Minimum daily fare: {money((Number(form.pricePerKm) || 0) * form.minimumKmPerDay)}</small><button type="button" className="outline-btn" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>}Save vehicle</button></div></form>}
    {loading ? <div className="trip-loading"><LoaderCircle className="spin" size={18}/>Loading vehicles…</div> : vehicles.length ? <div className="admin-vehicle-list">{vehicles.map(vehicle => <article className={`admin-vehicle-card ${vehicle.active ? '' : 'inactive'}`} key={vehicle._id}><span className="admin-vehicle-icon"><CarFront size={19}/></span><div className="admin-vehicle-name"><b>{vehicle.name}</b><small>{vehicle.active ? 'Available for new requests' : 'Hidden from customers'}</small></div><div className="admin-vehicle-stat"><span><Users size={14}/>Seats</span><b>{vehicle.seatCapacity}</b></div><div className="admin-vehicle-stat"><span>Price / km</span><b>{money(vehicle.pricePerKm)}</b></div><div className="admin-vehicle-stat"><span>Minimum / day</span><b>{vehicle.minimumKmPerDay} km</b></div><div className="admin-vehicle-stat"><span>Minimum fare</span><b>{money(vehicle.minimumKmPerDay * vehicle.pricePerKm)}</b></div><div className="admin-vehicle-actions"><button className="small-action" onClick={() => beginEdit(vehicle)}><Pencil size={14}/>Edit</button><button className="small-action" disabled={busy === vehicle._id} onClick={() => setActive(vehicle, !vehicle.active)}>{vehicle.active ? <><Trash2 size={14}/>Hide</> : <><RotateCcw size={14}/>Restore</>}</button></div></article>)}</div> : <div className="admin-empty"><CarFront size={24}/><b>No vehicles added</b><span>Add a vehicle to make it available for full-day requests.</span></div>}
  </div>;
}
