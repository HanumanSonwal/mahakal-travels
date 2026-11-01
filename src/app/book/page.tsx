"use client";

import FullDayBooking from "@/components/full-day-booking";
import { money } from "@/lib/finance";
import { formatTime12h } from "@/lib/time";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RotateCcw,
  Search,
  Users,
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

export default function BookingPage() {
  const [trips, setTrips] = useState<Trip[]>([]),
    [customer, setCustomer] = useState<Customer | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
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
      .catch(() => {});
  }, []);
  const beginBooking = (trip: Trip) => {
    if (!customer) {
      window.location.assign("/account?next=%2Fbook");
      return;
    }
    setSelected(trip);
    setPhone(customer.phone || "");
    setSeats(1);
    setError("");
  };
  const filtered = useMemo(
    () =>
      trips.filter((t) =>
        `${t.origin} ${t.destination} ${t.date}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [trips, search],
  );
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
    <main className="booking-page">
      <header className="booking-top">
        <a className="booking-brand" href="/book">
          <img src="/mahakal-travel.jpg" alt="Mahakal Travel logo" />
          <span>
            <b>Mahakal</b>
            <strong>TRAVEL</strong>
          </span>
        </a>
        <a className="admin-link" href="/account">
          {customer ? "My bookings" : "Sign in / Sign up"}{" "}
          <ArrowRight size={15} />
        </a>
      </header>
      <section className="booking-hero">
        <div className="booking-hero-copy">
          <span className="booking-kicker">YOUR NEXT JOURNEY STARTS HERE</span>
          <h1>
            Travel safe.
            <br />
            <em>Travel together.</em>
          </h1>
          <p>
            Choose your route, pick a departure and reserve your seats in just a
            few steps.
          </p>
          <div className="booking-trust">
            <span>
              <CheckCircle2 size={15} /> Instant seat confirmation
            </span>
            <span>
              <Users size={15} /> Live seat availability
            </span>
          </div>
        </div>
        <img
          className="booking-hero-logo"
          src="/mahakal-travel.jpg"
          alt="Mahakal Travel"
        />
      </section>
      <FullDayBooking />
      <section className="trip-browser">
        <div className="trip-section-head">
          <div>
            <span className="booking-kicker">SCHEDULED RIDES</span>
            <h2>Find your trip</h2>
            <p>Routes, departure times, open seats and fares.</p>
          </div>
          <label className="trip-search">
            <Search size={17} />
            <input
              placeholder="Search a city or route"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {error && <div className="booking-error">{error}</div>}
        {loading ? (
          <div className="trip-loading">
            <LoaderCircle size={20} className="spin" />
            Loading trips…
          </div>
        ) : filtered.length ? (
          <div className="trip-grid">
            {filtered.map((trip) => (
              <article
                className={`trip-card ${trip.tripType === "ROUND_TRIP" ? "round-trip-card" : ""}`}
                key={trip._id}
              >
                <div className="trip-card-date">
                  <CalendarDays size={16} />
                  {dateLabel(trip.date)}
                  {trip.tripType === "ROUND_TRIP" && (
                    <span className="trip-type-pill">
                      <RotateCcw size={11} /> ROUND TRIP
                    </span>
                  )}
                  <span className="seats-left">
                    {trip.availableSeats}{" "}
                    {trip.availableSeats === 1 ? "seat" : "seats"} left
                  </span>
                </div>
                <div className="trip-route">
                  <div>
                    <b>{formatTime12h(trip.departureTime)}</b>
                    <span>{trip.origin}</span>
                  </div>
                  <div className="route-middle">
                    <span>
                      {trip.tripType === "ROUND_TRIP" ? "GOING" : "TO"}
                    </span>
                    <i />
                    <ArrowRight size={14} />
                  </div>
                  <div className="route-destination">
                    <b>{formatTime12h(trip.arrivalTime)}</b>
                    <span>{trip.destination}</span>
                  </div>
                </div>
                {trip.tripType === "ROUND_TRIP" && (
                  <div className="trip-return-strip">
                    <span className="return-trip-label">RETURN LEG</span>
                    <b>
                      {dateLabel(trip.returnDate)} ·{" "}
                      {formatTime12h(trip.returnDepartureTime)}
                      {trip.returnArrivalTime
                        ? ` – ${formatTime12h(trip.returnArrivalTime)}`
                        : ""}
                    </b>
                  </div>
                )}
                {trip.notes && <p className="trip-notes">{trip.notes}</p>}
                <div className="trip-card-footer">
                  <div>
                    <small>
                      {trip.tripType === "ROUND_TRIP"
                        ? "ROUND-TRIP FARE / SEAT"
                        : "FARE / SEAT"}
                    </small>
                    <b>{money(trip.farePerSeat)}</b>
                  </div>
                  <button
                    className="book-seat-btn"
                    onClick={() => beginBooking(trip)}
                  >
                    Book seats <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="no-trips">
            <span className="no-trips-icon">
              <CarFront size={21} />
            </span>
            <b>
              {search ? "No trips match that search" : "No trips scheduled yet"}
            </b>
            <small>
              {search
                ? "Try another city or route."
                : "Please check back soon for upcoming Mahakal Travel routes."}
            </small>
          </div>
        )}
      </section>
      <footer className="booking-footer">
        <span>MAHAKAL TRAVEL · SAFE JOURNEY, BETTER TOMORROW</span>
        <span>Need help? Contact your travel operator.</span>
      </footer>
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
