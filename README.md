# Eeco Ledger

A responsive vehicle income and expense manager for a Suzuki Eeco. The app uses Next.js App Router, MongoDB/Mongoose, Tailwind CSS, Recharts, and client-side Excel/PDF exports.

## Run locally

1. Install Node.js 20.9+ and MongoDB (local or hosted).
2. Copy `.env.example` to `.env.local`, set `MONGODB_URI`, and set `AUTH_SECRET` to a random secret of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
3. Run `npm install`, then `npm run dev` and open http://localhost:3000.
4. Use `npm run build` and `npm start` for a production build.

## Features

- Dashboard cards for today and the selected month, daily collection/expense and profit charts, variable expense breakdown, and recent entries.
- One-minute daily entry with live profit/loss, optional custom expenses, notes, and Completed Trip / No Trip / Holiday day status.
- Daily record editing, deletion with confirmation, search, and date filtering.
- Monthly summaries and Excel/PDF exports. Monthly net includes the complete EMI and salary once, while per-record calculations show daily allocation based on that record's calendar month. Unrecorded days are excluded from averages and profitable/loss day counts.
- Editable vehicle, monthly EMI, driver salary, currency, and business start date settings.
- First-run owner account setup, hashed passwords, signed HTTP-only sessions, protected dashboard/API routes, and logout.
- A public `/book` customer page and owner-managed one-way or round-trip schedules, including return date/timings, seats, full-trip fare, live availability, and booking references. Customers can sign up at `/account`, view schedule updates, edit passenger/seat details, and cancel their own reservations.

On first launch, visit `/admin/login` and create the single owner account using your name, email, and a password of at least 10 characters. Once created, additional admin setup is disabled. Customers create their own accounts from `/account`. Keep `AUTH_SECRET` private and stable; changing it signs out active sessions.

## Data model

`DailyRecord` stores one record per ISO date (unique index), status, collection, standard expense fields, custom expense name/amount pairs, notes, and timestamps. `AppSettings` stores the singleton vehicle name, EMI, driver salary, currency, and business start date. `User` stores admin/customer accounts and scrypt password hashes. `Trip` stores route, date/time, fare per seat, total/available seats, and schedule status. `Booking` stores its customer account, contact details, and fare/seat snapshots. Set `MONGODB_URI` before starting; API errors are shown in the app if the database is unavailable.

## API

- `GET /api/records` supports `month`, `from`, and `to` query parameters.
- `POST /api/records` creates or upserts a record by date.
- `PUT /api/records/:id` and `DELETE /api/records/:id` update/delete records.
- `GET /api/settings` reads/initializes settings; `PUT /api/settings` saves them.
- `GET /api/trips` lists future trips with seats available; `POST /api/trips` creates a customer booking and atomically reserves seats.
- `/api/admin/trips` and `/api/admin/bookings` require the owner session and manage schedules/reservations; trip edits preserve already-booked seats, and booking cancellation releases seats.
