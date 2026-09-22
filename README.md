# BOOKORA AI

Appointment-booking SaaS for service businesses: bookings, calendar, customers,
staff, services, analytics, a public booking page, and an AI business assistant
that answers questions from business data.

Built with TanStack Start (React 19 + Vite), Tailwind CSS v4, and Supabase
for database, auth, and row-level security.

## Requirements

- Node.js 20 or newer (Bun also works)
- A Supabase project

## Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npx tsc --noEmit` | TypeScript typecheck |
| `npm run lint` | Lint |

## Database and security

Migrations live in `supabase/migrations/` and are applied in order with the
Supabase CLI:

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

The application uses business-scoped RLS, protected membership/role changes,
server-side booking validation, business-timezone working hours, conflict
detection, buffers, holidays, and secure RPCs for public booking.

Plan entitlements are also enforced at the database boundary. Free, Pro and
Ultimate limits cover active staff, locations and services, while paid
features are checked through `bookora_plan_allows_feature`. Direct browser
attempts to change plan/billing state are rejected; billing automation must
use the server-side/service role path.

The repository's security work was previously tested against a local
PostgreSQL environment. A remote Supabase project still needs its migrations
applied and independently verified before production use.

## Product status

| Area | State |
| --- | --- |
| Authentication and protected routes | Implemented |
| Business onboarding | Implemented |
| Tenant isolation / RLS | Implemented; remote verification still required |
| Booking engine | Implemented with database validation |
| Dashboard / bookings / calendar | Implemented |
| Customers / staff / services | Implemented |
| Analytics / CSV export | Implemented and plan-gated |
| AI business assistant | Implemented and Pro/Ultimate gated |
| Public booking | Implemented through validated database RPCs |
| Manual payment ledger | Implemented |
| Free / Pro / Ultimate entitlements | Database-enforced limits and feature gates |
| Online card payments | Not configured; no provider credentials committed |
| Email/SMS delivery | Not configured; no provider credentials committed |

Anything requiring an external provider remains disabled until that provider is
configured. No fake payment, notification, or AI capability should be presented
as production-ready.

## Environment

See `.env.example`. Client-visible `VITE_*` values are safe to expose in the
browser. Server-only secrets must never be committed.

The AI assistant requires the configured AI gateway/provider environment.
Supabase requires the configured project URL and publishable key.

## Verification

Every push to `main` now runs GitHub Actions for:

1. `npm ci`
2. `npx tsc --noEmit`
3. `npm run build`

Check the repository Actions tab for the latest verification result.

## Deployment

The application is designed for a TanStack Start-compatible host. Deployment
requires a configured hosting provider and the same required environment
variables. This repository does not contain provider credentials and therefore
must not claim a live deployment until the deployment service reports a
successful release.

## Backup

- Database: `supabase db dump -f backup.sql`
- Source: GitHub repository history
