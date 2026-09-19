# BOOKORA AI — local setup guide

## 1. Prerequisites

- Node.js 20+ (or Bun 1.1+)
- Supabase CLI (`npm i -g supabase`) if you want to run migrations yourself

## 2. Install

```sh
npm install
```

## 3. Environment

```sh
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL` / `SUPABASE_URL` — your project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` — publishable key
- `VITE_SUPABASE_PROJECT_ID` / `SUPABASE_PROJECT_ID` — project ref
- `LOVABLE_API_KEY` — only needed for the AI assistant

## 4. Database

```sh
supabase link --project-ref <ref>
supabase db push
```

This creates all ten tables, grants, row-level security policies, and the
`is_business_member` helper function.

In your project's auth settings, enable email/password sign-in. Email
confirmation is on by default; turn it off only for local testing.

## 5. Run

```sh
npm run dev      # http://localhost:8080
```

First run: sign up, then the onboarding wizard creates your business, first
service, first staff member, and Mon–Fri 9–5 working hours.

## 6. Verify

```sh
npx tsgo --noEmit
npm run lint
npm run build
```

## 7. Known gaps

- Online payments are not connected. Payments are recorded manually from the
  bookings page; balances and payment status are derived by database triggers.
- Notifications are stored as records; nothing is actually emailed or texted.
- Plan limits are shown but not enforced on the server.
- The public booking page is now fully validated server-side (business
  timezone, working hours, buffer, conflicts, holidays) through the
  `public_create_booking` RPC, and availability comes from
  `get_available_slots`. This has been verified on a local PostgreSQL 18.4
  instance with a 60-case test suite, but **not yet on the remote Supabase
  project** — apply the `20260917_001`/`20260917_002` migrations there and
  re-verify before production.
