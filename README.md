# BOOKORA AI

Appointment-booking SaaS for service businesses: bookings, calendar, customers,
staff, services, analytics, a public booking page, and an AI business assistant
that answers questions from business data.

Built with TanStack Start (React 19 + Vite), Tailwind CSS v4, and Supabase
for database, auth, and row-level security.

## Requirements

- Windows 10/11 for the Windows workflow
- Node.js 20 or newer (Bun 1.3.4+ is recommended)
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
| `bun run typecheck` | TypeScript typecheck |
| `npm run lint` | Lint |
| `npm run env:check` | Validate required local Supabase client environment variables |

## Windows installation

A repository-provided PowerShell installer prepares a local production build without embedding credentials:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-windows.ps1
```

For details, see `docs/INSTALL_WINDOWS.md`. This is a local/PWA installation workflow, not a claim of a signed Windows `.exe` installer.

## Windows executable

The repository now includes a reproducible **unsigned Windows x64 executable package**. It is a local static-client launcher around the production client build; it is not a signed native desktop application and does not remove the need for a configured `.env` at build time.

Build locally with `bun run windows:build`. GitHub Actions also provides a Windows artifact workflow at `.github/workflows/windows-exe.yml`.

## PWA installation

The app includes a web manifest and production service worker. On an HTTPS deployment, supported browsers can offer **Install BOOKORA AI** / **Add to Home Screen**. The service worker provides cached shell/offline fallback behavior; authenticated database operations still require network access.

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

Every push to `main` runs GitHub Actions with Bun 1.3.4 for dependency installation, TypeScript, formatting, linting and production build. The Windows executable workflow builds an unsigned Windows x64 artifact separately.

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
