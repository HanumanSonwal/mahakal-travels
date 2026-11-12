"use client";

import FullDayBooking from "@/components/full-day-booking";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { money } from "@/lib/finance";
import { formatTime12h } from "@/lib/time";
import {
  ArrowLeftRight,
  ArrowRight,
  Bus,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Route,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Trip = {
  _id: string;
  origin: string;
  destination: string;
  tripType: "ONE_WAY" | "ROUND_TRIP";
  date: string;
  departureTime: string;
  arrivalTime: string;
  returnDate: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  farePerSeat: number;
  totalSeats: number;
  availableSeats: number;
  notes: string;
};
type Confirmation = {
  booking: {
    bookingCode: string;
    customerName: string;
    seats: number;
    totalFare: number;
  };
  trip: {
    origin: string;
    destination: string;
    tripType: "ONE_WAY" | "ROUND_TRIP";
    date: string;
    departureTime: string;
    arrivalTime: string;
    returnDate: string;
    returnDepartureTime: string;
    returnArrivalTime: string;
  };
};
type Customer = { name: string; email: string; phone: string };
const parse = async (r: Response) => {
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return {
      error:
        "The server returned an invalid response. Please refresh and try again.",
    };
  }
};
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const isoDate = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const faqs: [string, string][] = [
  ["How do I book a trip on Mahakal Travels?", "Search your route, choose a departure from the list and tap “Book Seats”. Sign in, add your mobile number, pick the number of seats and confirm. Your booking reference appears immediately."],
  ["Do I need an account to book?", "Yes. You can sign in with a one-time verification code sent to your email, or continue with Google. Signing in lets you view and manage your bookings later."],
  ["Can I change or cancel my booking?", "Open “My bookings” from your profile. You can update the passenger name, mobile number or seat count, or cancel the booking to release the seats."],
  ["What is a round trip?", "A round-trip listing includes both the going and the return leg. The fare shown is per seat for both legs, and the return date and time are listed on the trip."],
  ["How does full-day vehicle hire work?", "Choose a date and an available vehicle, share your pickup, destination and estimated distance. The estimate uses the vehicle’s per-km rate with a minimum km per day; toll and parking are extra. The operator confirms the final fare and availability with you."],
  ["Where can I see my booking reference?", "It is shown on the confirmation screen right after booking, and on every booking card in “My bookings”."],
];

export default function BookingPage() {
  const [trips, setTrips] = useState<Trip[]>([]),
    [customer, setCustomer] = useState<Customer | null>(null),
    [authChecked, setAuthChecked] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [travelDate, setTravelDate] = useState(""),
    [selected, setSelected] = useState<Trip | null>(null),
    [phone, setPhone] = useState(""),
    [seats, setSeats] = useState(1),
    [saving, setSaving] = useState(false),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/trips"),
        data = await parse(r);
      if (!r.ok) throw new Error(data.error);
      setTrips(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load available trips.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    fetch("/api/customer-auth/status")
      .then(parse)
      .then((data) => {
        if (data.user) setCustomer(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCustomer(null);
  };
  const beginBooking = (trip: Trip) => {
    if (!customer) {
      window.location.assign("/account?next=%2F");
      return;
    }
    setSelected(trip);
    setPhone(customer.phone || "");
    setSeats(1);
    setError("");
  };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase(),
      f = from.trim().toLowerCase(),
      d = to.trim().toLowerCase();
    return trips.filter(
      (t) =>
        `${t.origin} ${t.destination} ${t.date}`.toLowerCase().includes(q) &&
        t.origin.toLowerCase().includes(f) &&
        t.destination.toLowerCase().includes(d) &&
        (!travelDate || t.date === travelDate),
    );
  }, [trips, search, from, to, travelDate]);
  const cities = useMemo(
    () => ({
      origins: [...new Set(trips.map((t) => t.origin))].sort(),
      destinations: [...new Set(trips.map((t) => t.destination))].sort(),
    }),
    [trips],
  );
  const routes = useMemo(() => {
    const map = new Map<string, { key: string; origin: string; destination: string; count: number; minFare: number }>();
    for (const t of trips) {
      const key = `${t.origin}→${t.destination}`;
      const r = map.get(key);
      if (r) {
        r.count += 1;
        r.minFare = Math.min(r.minFare, t.farePerSeat);
      } else map.set(key, { key, origin: t.origin, destination: t.destination, count: 1, minFare: t.farePerSeat });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [trips]);
  const stats = useMemo(
    () => ({
      routes: new Set(trips.map((t) => `${t.origin}→${t.destination}`)).size,
      trips: trips.length,
      seats: trips.reduce((sum, t) => sum + t.availableSeats, 0),
      cities: new Set(trips.flatMap((t) => [t.origin, t.destination])).size,
    }),
    [trips],
  );
  const scrollToTrips = () =>
    document.getElementById("scheduled-trips")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId: selected._id, phone, seats }),
        }),
        data = await parse(r);
      if (!r.ok) throw new Error(data.error);
      setConfirmation(data);
      setSelected(null);
      setPhone("");
      setSeats(1);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete booking.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="booking-page mt-home">
      <SiteHeader customer={customer} ready={authChecked} onLogout={logout} loginHref="/account?next=%2F" />

      <section className="mt-hero">
        <div className="mt-hero-inner">
          <div className="mt-hero-copy">
            <span className="mt-hero-badge">MAHAKAL TRAVELS</span>
            <h1>Travel safe. <em>Travel together.</em></h1>
            <p>Choose your route, pick a departure and reserve your seats in just a few steps.</p>
          </div>
          <form
            className="mt-search-card"
            onSubmit={(e) => {
              e.preventDefault();
              scrollToTrips();
            }}
          >
            <div className="mt-search-tabs" role="tablist">
              <button type="button" className="active"><Bus size={17} />Shared Trips</button>
              <a href="#full-day"><CarFront size={17} />Full-Day Vehicle</a>
            </div>
            <div className="mt-search-row">
              <label className="mt-field">
                <MapPin size={19} />
                <span>
                  <small>From</small>
                  <input list="mt-origins" placeholder="Leaving From" value={from} onChange={(e) => setFrom(e.target.value)} />
                </span>
              </label>
              <button type="button" className="mt-swap" aria-label="Swap cities" onClick={() => { setFrom(to); setTo(from); }}>
                <ArrowLeftRight size={16} />
              </button>
              <label className="mt-field">
                <MapPin size={19} />
                <span>
                  <small>To</small>
                  <input list="mt-destinations" placeholder="Going To" value={to} onChange={(e) => setTo(e.target.value)} />
                </span>
              </label>
              <label className="mt-field mt-date-field">
                <CalendarDays size={19} />
                <span>
                  <small>Departure Date</small>
                  <input type="date" min={isoDate(0)} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
                </span>
              </label>
              <div className="mt-quick-dates">
                <button type="button" className={travelDate === isoDate(0) ? 'active' : ''} onClick={() => setTravelDate(isoDate(0))}>Today</button>
                <button type="button" className={travelDate === isoDate(1) ? 'active' : ''} onClick={() => setTravelDate(isoDate(1))}>Tomorrow</button>
              </div>
              <button className="mt-search-btn" type="submit"><Search size={18} />Search</button>
            </div>
            <datalist id="mt-origins">{cities.origins.map((c) => <option key={c} value={c} />)}</datalist>
            <datalist id="mt-destinations">{cities.destinations.map((c) => <option key={c} value={c} />)}</datalist>
          </form>
        </div>
      </section>

      <section className="mt-section" id="offers">
        <div className="mt-section-head">
          <h2>Travel Offers &amp; Services</h2>
        </div>
        <div className="mt-offers">
          <a className="mt-offer o1" href="#scheduled-trips">
            <span><Users size={22} /></span>
            <div><small>SHARED RIDES</small><b>Book only the seats you need</b><em>Live seat availability</em></div>
          </a>
          <a className="mt-offer o2" href="#scheduled-trips">
            <span><RotateCcw size={22} /></span>
            <div><small>ROUND TRIPS</small><b>Going &amp; return in one fare</b><em>One booking, both legs</em></div>
          </a>
          <a className="mt-offer o3" href="#full-day">
            <span><CarFront size={22} /></span>
            <div><small>FULL-DAY HIRE</small><b>Reserve a vehicle for the day</b><em>Per-km transparent pricing</em></div>
          </a>
          <a className="mt-offer o4" href="/account#my-bookings">
            <span><Ticket size={22} /></span>
            <div><small>MANAGE ONLINE</small><b>Edit or cancel your booking</b><em>From your account</em></div>
          </a>
        </div>
      </section>

      <section className="mt-section trip-browser" id="scheduled-trips">
        <div className="mt-section-head">
          <div>
            <h2>Available Trips</h2>
            <p>{loading ? 'Checking schedules…' : `${filtered.length} ${filtered.length === 1 ? 'trip' : 'trips'} found${from || to || travelDate ? ' for your search' : ''}`}</p>
          </div>
          <div className="mt-results-tools">
            {(from || to || travelDate || search) && (
              <button type="button" className="mt-clear" onClick={() => { setFrom(''); setTo(''); setTravelDate(''); setSearch(''); }}>
                <X size={14} />Clear filters
              </button>
            )}
            <label className="trip-search">
              <Search size={17} />
              <input placeholder="Search a city or route" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
        </div>
        {error && <div className="booking-error">{error}</div>}
        {loading ? (
          <div className="trip-loading">
            <LoaderCircle size={20} className="spin" />
            Loading trips…
          </div>
        ) : filtered.length ? (
          <div className="mt-trip-list">
            {filtered.map((trip) => (
              <article className={`mt-trip ${trip.tripType === 'ROUND_TRIP' ? 'is-round' : ''}`} key={trip._id}>
                <div className="mt-trip-main">
                  <div className="mt-trip-op">
                    <b>Mahakal Travels</b>
                    <small><CalendarDays size={13} />{dateLabel(trip.date)}</small>
                    {trip.tripType === 'ROUND_TRIP' ? (
                      <span className="mt-tag round"><RotateCcw size={11} />Round trip</span>
                    ) : (
                      <span className="mt-tag">One way</span>
                    )}
                  </div>
                  <div className="mt-trip-time">
                    <b>{formatTime12h(trip.departureTime)}</b>
                    <span>{trip.origin}</span>
                  </div>
                  <div className="mt-trip-line">
                    <small>{trip.tripType === 'ROUND_TRIP' ? 'GOING' : 'TO'}</small>
                    <i />
                  </div>
                  <div className="mt-trip-time end">
                    <b>{formatTime12h(trip.arrivalTime)}</b>
                    <span>{trip.destination}</span>
                  </div>
                  <div className="mt-trip-fare">
                    <small>{trip.tripType === 'ROUND_TRIP' ? 'Round-trip fare / seat' : 'Fare / seat'}</small>
                    <b>{money(trip.farePerSeat)}</b>
                    <span className={`mt-seats ${trip.availableSeats <= 3 ? 'low' : ''}`}>
                      {trip.availableSeats} {trip.availableSeats === 1 ? 'seat' : 'seats'} left
                    </span>
                  </div>
                  <button className="mt-book-btn" onClick={() => beginBooking(trip)}>Book Seats</button>
                </div>
                {trip.tripType === 'ROUND_TRIP' && (
                  <div className="mt-trip-return">
                    <span>RETURN</span>
                    <b>
                      {dateLabel(trip.returnDate)} · {formatTime12h(trip.returnDepartureTime)}
                      {trip.returnArrivalTime ? ` – ${formatTime12h(trip.returnArrivalTime)}` : ''}
                    </b>
                  </div>
                )}
                {trip.notes && <p className="mt-trip-notes">{trip.notes}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="no-trips">
            <span className="no-trips-icon"><Bus size={21} /></span>
            <b>{from || to || travelDate || search ? 'No trips match that search' : 'No trips scheduled yet'}</b>
            <small>{from || to || travelDate || search ? 'Try another city, route or date.' : 'Please check back soon for upcoming Mahakal Travel routes.'}</small>
          </div>
        )}
      </section>

      <div className="mt-section" id="full-day">
        <FullDayBooking />
      </div>

      <section className="mt-section mt-why">
        <div className="mt-section-head">
          <div>
            <h2>Why Choose Mahakal Travels?</h2>
            <p>A simple, transparent and reliable way to book your next ride.</p>
          </div>
        </div>
        <div className="mt-why-grid">
          <div><span><Route size={22} /></span><b>Scheduled routes</b><p>Fixed departure and arrival times published in advance for every trip.</p></div>
          <div><span><Users size={22} /></span><b>Live seat availability</b><p>See exactly how many seats are left before you book.</p></div>
          <div><span><ShieldCheck size={22} /></span><b>Instant confirmation</b><p>Your seats are reserved the moment your booking reference appears.</p></div>
          <div><span><Wallet size={22} /></span><b>Clear fares</b><p>Per-seat fares and per-km full-day rates shown upfront.</p></div>
        </div>
      </section>

      {routes.length > 0 && (
        <section className="mt-section" id="popular-routes">
          <div className="mt-section-head">
            <div>
              <h2>Popular Routes</h2>
              <p>Tap a route to see its upcoming departures.</p>
            </div>
          </div>
          <div className="mt-routes">
            {routes.map((r) => (
              <button
                type="button"
                className="mt-route"
                key={r.key}
                onClick={() => { setFrom(r.origin); setTo(r.destination); setTravelDate(''); setSearch(''); scrollToTrips(); }}
              >
                <b>{r.origin} <ArrowRight size={14} /> {r.destination}</b>
                <small>{r.count} {r.count === 1 ? 'trip' : 'trips'} · from {money(r.minFare)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-section" id="how-to-book">
        <div className="mt-section-head">
          <div>
            <h2>How to Book a Trip on Mahakal Travels</h2>
            <p>Reserve your seats in four quick steps.</p>
          </div>
        </div>
        <ol className="mt-steps">
          <li><span>1</span><b>Search your route</b><p>Enter where you are leaving from, where you are going and your travel date.</p></li>
          <li><span>2</span><b>Pick a departure</b><p>Compare times, fares and seats left, then tap “Book Seats”.</p></li>
          <li><span>3</span><b>Sign in</b><p>Log in with an email verification code or your Google account.</p></li>
          <li><span>4</span><b>Confirm</b><p>Add your mobile number, choose seats and receive your booking reference.</p></li>
        </ol>
      </section>

      <section className="mt-stats">
        <div><b>{stats.routes}</b><span>Routes</span></div>
        <div><b>{stats.trips}</b><span>Upcoming trips</span></div>
        <div><b>{stats.seats}</b><span>Seats available</span></div>
        <div><b>{stats.cities}</b><span>Cities served</span></div>
      </section>

      <section className="mt-section" id="faq">
        <div className="mt-section-head">
          <h2>Mahakal Travels FAQs</h2>
        </div>
        <div className="mt-faq">
          {faqs.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}<ChevronDown size={18} /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-section mt-about" id="about">
        <h2>About Mahakal Travels</h2>
        <p>
          Mahakal Travels runs scheduled shared rides and full-day vehicle hire. Every trip lists its route, departure
          and arrival time, fare per seat and the seats still open, so you can plan with confidence. Book one-way or
          round trips online, manage your bookings from your account, and request a vehicle for the whole day when your
          plans need more flexibility.
        </p>
      </section>

      <SiteFooter />
      {selected && (
        <div
          className="booking-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <form className="booking-modal" onSubmit={submit}>
            <div className="booking-modal-head">
              <div>
                <span className="booking-kicker">RESERVE YOUR SEATS</span>
                <h2>
                  {selected.origin} <ArrowRight size={18} />{" "}
                  {selected.destination}
                </h2>
                <p>
                  <CalendarDays size={14} />
                  {dateLabel(selected.date)} <Clock3 size={14} />
                  {formatTime12h(selected.departureTime)}
                  {selected.arrivalTime
                    ? ` – ${formatTime12h(selected.arrivalTime)}`
                    : ""}
                </p>
                {selected.tripType === "ROUND_TRIP" && (
                  <p className="return-modal-time">
                    <RotateCcw size={14} />
                    {dateLabel(selected.returnDate)} · Return{" "}
                    {formatTime12h(selected.returnDepartureTime)}
                    {selected.returnArrivalTime
                      ? ` – ${formatTime12h(selected.returnArrivalTime)}`
                      : ""}
                  </p>
                )}
              </div>
              <button
                className="booking-close"
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>
            <div className="booking-form">
              <div className="passenger-account">
                <b>{customer?.name}</b>
                <small>{customer?.email}</small>
              </div>
              <label>
                Mobile number
                <input
                  autoComplete="tel"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  minLength={7}
                  maxLength={20}
                  placeholder="For booking contact"
                />
              </label>
              <label>
                Number of seats
                <select
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                >
                  {Array.from(
                    { length: Math.min(selected.availableSeats, 10) },
                    (_, i) => (
                      <option value={i + 1} key={i + 1}>
                        {i + 1} {i === 0 ? "seat" : "seats"}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="fare-summary">
                <span>
                  {seats} × {money(selected.farePerSeat)} per seat
                </span>
                <b>
                  Total fare{" "}
                  <strong>{money(seats * selected.farePerSeat)}</strong>
                </b>
              </div>
              {error && <div className="booking-error">{error}</div>}
              <button className="confirm-booking-btn" disabled={saving}>
                {saving ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <>
                    Confirm booking <ArrowRight size={16} />
                  </>
                )}
              </button>
              <small className="booking-terms">
                Your seats are reserved when the booking confirmation appears.
              </small>
            </div>
          </form>
        </div>
      )}
      {confirmation && (
        <div
          className="booking-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmation(null);
          }}
        >
          <section className="confirmation-modal">
            <div className="confirmation-check">
              <CheckCircle2 size={31} />
            </div>
            <span className="booking-kicker">BOOKING CONFIRMED</span>
            <h2>
              You’re all set, {confirmation.booking.customerName.split(" ")[0]}.
            </h2>
            <p>
              {confirmation.trip.origin} to {confirmation.trip.destination}
              <br />
              {dateLabel(confirmation.trip.date)} ·{" "}
              {formatTime12h(confirmation.trip.departureTime)}
            </p>
            {confirmation.trip.tripType === "ROUND_TRIP" && (
              <p className="confirmation-return">
                <RotateCcw size={13} />
                Return {dateLabel(confirmation.trip.returnDate)} ·{" "}
                {formatTime12h(confirmation.trip.returnDepartureTime)}
              </p>
            )}
            <div className="booking-reference">
              <small>BOOKING REFERENCE</small>
              <b>{confirmation.booking.bookingCode}</b>
            </div>
            <div className="confirmation-total">
              <span>
                {confirmation.booking.seats}{" "}
                {confirmation.booking.seats === 1 ? "seat" : "seats"} · Total
                fare
              </span>
              <b>{money(confirmation.booking.totalFare)}</b>
            </div>
            <button
              className="confirm-booking-btn"
              onClick={() => setConfirmation(null)}
            >
              Done
            </button>
            <small className="booking-terms">
              Keep your booking reference for your records.
            </small>
          </section>
        </div>
      )}
    </main>
  );
}
