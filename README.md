# BOOKORA AI

Appointment-booking SaaS for service businesses: bookings, calendar, customers,
staff, services, analytics, a public booking page, and an AI business assistant
that answers questions from your own data.

Built with TanStack Start (React 19 + Vite), Tailwind CSS v4, and Supabase
(Lovable Cloud) for database, auth, and row-level security.

## Requirements

- Node.js 20 or newer (Bun also works and is what the project is developed with)
- A Supabase project (or Lovable Cloud, which provisions one for you)

## Setup

```sh
npm install          # or: bun install
cp .env.example .env # fill in your project values
npm run dev          # http://localhost:8080
```

Commands:

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the dev server on port 8080 |
| `npm run build`     | Production build                  |
| `npx tsc --noEmit`  | TypeScript typecheck              |
| `npm run lint`      | Lint                              |

## Database

Migrations live in `supabase/migrations/`. Apply them in order to a fresh
project with the Supabase CLI:

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

Tables: `businesses`, `business_members`, `locations`, `services`, `staff`,
`working_hours`, `customers`, `bookings`, `payments`, `notifications`,
`holidays`.

Every table has row-level security enabled and is scoped by business
membership, so one business can never read or write another's data.

Security is enforced at the database level (RLS policies, row-level trigger
guards, and the `public_create_booking` / `get_available_slots` RPCs). The
migrations `20260917_001_secure_membership_and_public_data` and
`20260917_002_booking_engine_and_settings` add:

- membership protection (no self-join into other businesses, no
  self-promotion to owner/admin, last-owner protection),
- removal of all anonymous INSERT paths (public booking goes through the
  validating RPC only),
- server-side booking validation: business-timezone working hours,
  per-staff conflict detection with an advisory lock (no double-booking
  race), buffer, holidays, and input validation,
- booking/payment integrity triggers for all writers (overlapping
  appointments rejected; payment status derived from the payments table;
  overpayment and cross-business payments rejected).

This was verified against a local PostgreSQL 18.4 instance with a 60-case
test suite (role escalation, tenant isolation, anonymous access, conflict
and concurrency, buffers, holidays, timezones, payments). It has **not**
been verified against a remote Supabase project — apply the migrations
there and re-run the checks before trusting it in production.

## Environment variables

See `.env.example`. `VITE_*` values are public and shipped to the browser.
The non-prefixed values are read only on the server. `LOVABLE_API_KEY` powers
the AI assistant; without it the assistant reports that AI is not configured.

Never commit real keys. Service-role keys are not used by this codebase.

## Feature status (honest)

| Area                                                                      | State                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Sign up / sign in / session / protected routes                            | Working, tested                                        |
| Business onboarding (business, first service, first staff, working hours) | Working, tested                                        |
| Business data isolation (RLS + triggers)                                  | Working — 60-case DB test suite on local PostgreSQL; not yet verified on the remote Supabase project |
| Booking engine (conflicts, working hours, buffer, holidays, timezones)    | Working — enforced in the database, verified by the test suite |
| Dashboard, services, staff, customers, bookings, analytics screens        | Working, with loading/error/empty states               |
| AI business assistant (English + Urdu, real data)                         | Working, tested                                        |
| Multi-language (EN/UR/AR/ES/FR) + RTL, light/dark themes                  | Working                                                |
| Public booking page                                                       | Working — secure RPC only, real availability, business-timezone slots |
| Manual payment tracking (deposits, balances)                              | Recordable from the bookings page; balance/status derived by DB triggers |
| Online card payments (Stripe/Paddle), refunds, receipts                   | **Not implemented**                                    |
| Email / SMS / push notifications and reminders                            | **Not delivered** — no provider configured             |
| Plan limits (Free / Pro / Ultimate)                                       | UI only, not enforced server-side                      |

Anything marked not implemented is not wired to a real provider. Do not treat
it as production-ready.

## Deployment

Publish from Lovable, or build with `npm run build` and deploy the output to any
host that supports the Vite/TanStack Start edge output, with the same
environment variables set.

## Backup and export

- Database: `supabase db dump -f backup.sql`
- Source: push the repository to GitHub, or use the zipped export in
  `docs/` / the archive produced by `npm run build` inputs.
