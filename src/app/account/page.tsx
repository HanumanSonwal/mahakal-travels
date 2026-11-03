"use client";

import CustomerFullDayRequests from "@/components/customer-full-day-requests";
import CustomerAuthPanel from "@/components/customer-auth-panel";
import { money } from "@/lib/finance";
import { formatTime12h } from "@/lib/time";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Ticket,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = { name: string; email: string; phone: string };
type Booking = {
  _id: string;
  bookingCode: string;
  customerName: string;
  phone: string;
  email: string;
  seats: number;
  totalFare: number;
  farePerSeat: number;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
  trip?: {
    origin: string;
    destination: string;
    tripType: "ONE_WAY" | "ROUND_TRIP";
    date: string;
    departureTime: string;
    arrivalTime: string;
    returnDate: string;
    returnDepartureTime: string;
    returnArrivalTime: string;
    status: string;
  } | null;
};
const parse = async (r: Response) => {
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: "The server returned an invalid response. Refresh and try again.",
    };
  }
};
const dateLabel = (date?: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Trip details unavailable";

export default function CustomerAccountPage() {
  const [user, setUser] = useState<Customer | null>(null),
    [bookings, setBookings] = useState<Booking[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState<{
      id: string;
      name: string;
      phone: string;
      seats: number;
    } | null>(null);
  const loadBookings = useCallback(async () => {
    try {
      const r = await fetch("/api/bookings"),
        data = await parse(r);
      if (!r.ok) throw new Error(data.error);
      setBookings(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetch("/api/customer-auth/status")
      .then(parse)
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          void loadBookings();
        } else {
          if (data.error) setError(data.error);
          setLoading(false);
        }
      })
      .catch(() => {
        setError(
          "Could not connect to your account. Check your connection and refresh.",
        );
        setLoading(false);
      });
  }, [loadBookings]);
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/account");
  };
  const saveBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/bookings/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        }),
        data = await parse(r);
      if (!r.ok) throw new Error(data.error);
      setEditing(null);
      setNotice("Booking details updated.");
      await loadBookings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update booking.");
    } finally {
      setBusy(false);
    }
  };
  const cancelBooking = async (booking: Booking) => {
    if (
      !confirm(
        `Cancel booking ${booking.bookingCode}? The seats will be released.`,
      )
    )
      return;
    setError("");
    try {
      const r = await fetch(`/api/bookings/${booking._id}`, {
          method: "DELETE",
        }),
        data = await parse(r);
      if (!r.ok) throw new Error(data.error);
      setNotice("Booking cancelled.");
      await loadBookings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel booking.");
    }
  };
  const beginEdit = (booking: Booking) =>
    setEditing({
      id: booking._id,
      name: booking.customerName,
      phone: booking.phone,
      seats: booking.seats,
    });
  return (
    <main className="customer-page">
      <header className="booking-top">
        <a className="booking-brand" href="/book">
          <img src="/mahakal-travel.jpg" alt="Mahakal Travel logo" />
          <span>
            <b>Mahakal</b>
            <strong>TRAVEL</strong>
          </span>
        </a>
        <a className="admin-link" href="/book">
          Find a trip <ArrowRight size={15} />
        </a>
      </header>
      {loading ? (
        <div className="trip-loading">
          <LoaderCircle className="spin" size={19} />
          Loading your account…
        </div>
      ) : user ? (
        <section className="customer-dashboard">
          <div className="customer-welcome">
            <div>
              <span className="booking-kicker">CUSTOMER ACCOUNT</span>
              <h1>Hello, {user.name.split(" ")[0]}.</h1>
              <p>
                View your booking details and keep your passenger information up
                to date.
              </p>
            </div>
            <button className="customer-logout" onClick={logout}>
              <LogOut size={15} />
              Log out
            </button>
          </div>
          {error && <div className="booking-error">{error}</div>}
          {notice && (
            <div className="customer-notice">
              <Check size={15} />
              {notice}
              <button onClick={() => setNotice("")}>
                <X size={14} />
              </button>
            </div>
          )}
          <CustomerFullDayRequests />
          <div className="customer-section-head">
            <div>
              <h2>My bookings</h2>
              <p>Trip times and route below reflect the latest schedule.</p>
            </div>
            <a className="confirm-booking-btn customer-find-trip" href="/book">
              <Plus size={15} />
              Book a trip
            </a>
          </div>
          {bookings.length ? (
            <div className="customer-booking-list">
              {bookings.map((b) => (
                <article className="customer-booking-card" key={b._id}>
                  <div className="customer-booking-top">
                    <span className="booking-reference-label">
                      <Ticket size={14} />
                      {b.bookingCode}
                    </span>
                    <span
                      className={`booking-status ${b.status.toLowerCase()}`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="customer-route-line">
                    <div>
                      <span>FROM</span>
                      <b>{b.trip?.origin || "—"}</b>
                    </div>
                    <ArrowRight size={18} />
                    <div>
                      <span>TO</span>
                      <b>{b.trip?.destination || "—"}</b>
                    </div>
                  </div>
                  <div className="customer-booking-meta">
                    <span>
                      <CalendarDays size={14} />
                      {dateLabel(b.trip?.date)}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {formatTime12h(b.trip?.departureTime)}
                      {b.trip?.arrivalTime
                        ? ` – ${formatTime12h(b.trip.arrivalTime)}`
                        : ""}
                    </span>
                    {b.trip?.tripType === "ROUND_TRIP" && (
                      <span className="return-customer-meta">
                        <RotateCcw size={14} />
                        Return {dateLabel(b.trip.returnDate)} ·{" "}
                        {formatTime12h(b.trip.returnDepartureTime)}
                        {b.trip.returnArrivalTime
                          ? ` – ${formatTime12h(b.trip.returnArrivalTime)}`
                          : ""}
                      </span>
                    )}
                    <span>
                      <UserRound size={14} />
                      {b.seats} {b.seats === 1 ? "seat" : "seats"}
                    </span>
                  </div>
                  <div className="customer-booking-bottom">
                    <div>
                      <small>BOOKED FOR</small>
                      <b>
                        {b.customerName} · {b.phone}
                      </b>
                    </div>
                    <div>
                      <small>TOTAL FARE</small>
                      <b>{money(b.totalFare)}</b>
                    </div>
                    <div className="customer-booking-actions">
                      {b.status === "CONFIRMED" && (
                        <>
                          <button
                            className="small-action"
                            onClick={() => beginEdit(b)}
                          >
                            <Pencil size={14} />
                            Update
                          </button>
                          <button
                            className="small-action danger"
                            onClick={() => cancelBooking(b)}
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="no-trips customer-empty">
              <Ticket size={25} />
              <b>No bookings yet</b>
              <small>
                When you reserve a trip, its details and status will appear
                here.
              </small>
              <a href="/book" className="book-seat-btn">
                Browse available trips <ArrowRight size={15} />
              </a>
            </div>
          )}
        </section>
      ) : (
        <>
          {error && <div className="booking-error">{error}</div>}
          <CustomerAuthPanel />
        </>
      )}
      <footer className="booking-footer">
        <span>MAHAKAL TRAVEL · SAFE JOURNEY, BETTER TOMORROW</span>
        <span>Bookings are tied to your account.</span>
      </footer>
      {editing && (
        <div
          className="booking-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <form className="customer-edit-modal" onSubmit={saveBooking}>
            <div className="booking-modal-head">
              <div>
                <span className="booking-kicker">UPDATE RESERVATION</span>
                <h2>Passenger details</h2>
              </div>
              <button
                type="button"
                className="booking-close"
                onClick={() => setEditing(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="booking-form">
              <label>
                Passenger name
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((v) => (v ? { ...v, name: e.target.value } : v))
                  }
                  required
                  minLength={2}
                />
              </label>
              <label>
                Mobile number
                <input
                  type="tel"
                  value={editing.phone}
                  onChange={(e) =>
                    setEditing((v) => (v ? { ...v, phone: e.target.value } : v))
                  }
                  required
                  minLength={7}
                />
              </label>
              <label>
                Number of seats
                <select
                  value={editing.seats}
                  onChange={(e) =>
                    setEditing((v) =>
                      v ? { ...v, seats: Number(e.target.value) } : v,
                    )
                  }
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? "seat" : "seats"}
                    </option>
                  ))}
                </select>
              </label>
              <p className="booking-terms">
                Increasing the seat count depends on current availability. Your
                fare stays at the original per-seat price.
              </p>
              {error && <div className="booking-error">{error}</div>}
              <button className="confirm-booking-btn" disabled={busy}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
