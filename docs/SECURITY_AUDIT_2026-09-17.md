# BOOKORA AI — Security & Quality Audit Report (2026-09-17)

Branch: `arena/01a0b0a9-bookora-ai` · Baseline: `e4fb161` · Final: `2f0633d`

This report covers the full audit: P0 security (RLS, public booking, booking
engine), data-truthfulness fixes, error handling, i18n/RTL, accessibility,
onboarding, environment configuration, and build/preview verification.

Every milestone was committed, pushed, and verified against the remote
branch (`git fetch origin` + FETCH_HEAD comparison). No force pushes, no
rebase/amend of pushed commits.

---

## 1. Verification method for the database layer

This sandbox has **no Supabase credentials and no Supabase CLI**, so the
remote project could not be touched. Instead, the complete migration set
(8 files) was applied to a **local PostgreSQL 18.4 instance** (embedded) with
Supabase-like roles (`anon`, `authenticated`, `service_role`) and
`auth.uid()` emulated via `request.jwt.claims`, then exercised by a
**60-assertion security test suite** run as those roles, exactly like
PostgREST would.

Result: **PASSED 60 / FAILED 0** (re-run at every relevant milestone).

Coverage:

| Section                   | What was proven                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1–A10 membership         | Outsider self-join as owner/staff denied; staff self-promotion and cross-role change denied; owner changes allowed; last-owner demotion denied; admin can invite staff but not owner; cross-tenant read/update denied                                                                                                                                             |
| B1–B10 anonymous access   | Anon can read active business/services/staff/working_hours of completed businesses; **cannot** insert customers or bookings; cannot read other businesses' customers/bookings/payments; cannot call internal functions directly                                                                                                                                   |
| C1–C15 public booking RPC | Success path; duplicate/overlap conflict rejected; back-to-back allowed; before-open/after-close rejected; off-day rejected; cross-business service/staff rejected; bad slug/email/name rejected; past dates rejected; **day-of-week and working-hours checks run in the business timezone** (e.g. Mon 00:30 +05:30 = Sun 19:00 UTC allowed for a Mon-only staff) |
| D1–D8 slots               | 15 real slots generated from working hours; booked slots removed; off-day and holiday return empty; holiday booking rejected                                                                                                                                                                                                                                      |
| E1–E3 buffer              | Back-to-back denied when buffer = 30 min; gap ≥ buffer allowed                                                                                                                                                                                                                                                                                                    |
| F1–F4 member writes       | Overlap trigger rejects for **all** writers (not just anon); cross-business service denied; reschedule without self-conflict allowed; cancelled slot re-bookable                                                                                                                                                                                                  |
| G1–G7 payments            | Partial → `partial`; overpayment rejected; exact remaining → `paid`; negative rejected; cross-business rejected                                                                                                                                                                                                                                                   |
| H1 concurrency            | Two concurrent same-slot bookings → **exactly one winner** (advisory lock)                                                                                                                                                                                                                                                                                        |

**NOT VERIFIED:** the remote Supabase project. The two new migrations must be
applied there (`supabase db push` or SQL editor) and this suite re-run before
the security work can be called verified in production.

Test harness limitation (documented): the sandbox PostgreSQL tzdata is
corrupt for `Asia/Karachi` (reports +5:00 instead of +5:30); tests therefore
use `Asia/Kolkata` (a genuine +5:30 zone) as the +5:30 stand-in. Production
Supabase has complete tzdata. This is a test-environment artifact, not a
migration issue.

---

## 2. Milestone log

### M1 — Baseline recovery (syntax + typecheck)

- `fa50d25` AppLayout syntax restored; `f640228` Dashboard null-narrowing
  typecheck fix; `ee57989` full prettier pass.
- Evidence: tsc/lint/build all PASS (baseline `e4fb161` failed all three).

### M3 — P0 security (Phases 5, 6, 7 DB layer)

- `7cdc59c` — 2 new migrations + `types.ts`:
  - `20260917_001_secure_membership_and_public_data.sql`
    - Membership INSERT: no more self-join into any business as any role
      (the old policy let any authenticated user become `owner` of any
      business). Self-join requires `created_by = auth.uid()` and role
      `owner`; invites are owner/admin-only and cannot grant a higher role
      than the inviter holds.
    - Membership UPDATE: only owners change roles; the last owner cannot be
      demoted (role-escalation path closed).
    - **Anonymous INSERT policy on customers removed** (the
      `WITH CHECK (true)` hole) and anon INSERT grants on
      customers/bookings revoked: public booking must go through the
      validating RPC.
    - Anon SELECT policies split so anon no longer evaluates
      `is_business_member()` (which anon lacks EXECUTE for, making public
      queries fail with permission errors).
  - `20260917_002_booking_engine_and_settings.sql`
    - `public_create_booking` rewritten: `SET search_path = public`,
      `VOLATILE` (was `STABLE` while writing), **business-timezone**
      day-of-week and working-hours checks (was server TZ), per-staff
      advisory lock making conflict-check + insert atomic (closes the
      double-booking race), buffer and holiday enforcement, strict input
      validation, `EXECUTE` revoked from `PUBLIC`.
    - `create_public_booking` wrapper: `SECURITY DEFINER` with pinned
      search_path — the only anon-executable entry point.
    - `get_available_slots`: real slot generation (working hours, service
      duration, buffer, holidays, existing bookings) — replaces the UI's
      hardcoded slot list.
    - `bookings` trigger: overlapping non-cancelled appointments rejected
      for **all** writers; service/staff/customer/location must belong to
      the booking's business.
    - `payments` triggers: negative amounts and overpayment rejected;
      payment business must match booking business;
      `bookings.payment_status` derived from the payments table.
    - `businesses` gains `booking_buffer_minutes`,
      `cancellation_notice_hours`, `reminder_lead_minutes`; new
      `holidays` table (membership RLS).
- Evidence: 60/60 suite PASS (sections A–H above).

### M4 — Public booking frontend (Phase 6 UI)

- `84010f3` — `PublicBooking.tsx` rewired to the secure RPCs:
  - Time availability from `get_available_slots` (was a hardcoded
    09:00–16:30 list) with loading/empty/error states.
  - Submission via `create_public_booking`; confirmation screen renders
    **only** on an explicit success response and says "Booking Requested"
    (status is `pending` — the old "Booking Confirmed!" was a fake success).
  - Server rejection messages (slot taken, closed day, validation) shown
    to the customer instead of being swallowed.
  - New `zonedTimeToIso()` helper (`src/lib/utils.ts`) converts the
    selected wall-clock time in the business timezone to a UTC instant,
    mirroring the DB's `AT TIME ZONE` handling. Unit-checked: +5:30, +4,
    UTC, DST summer/winter, cross-midnight, invalid-zone fallback,
    round-trips — all pass.

### M5 — Bookings page (Phase 7 UI)

- `e3040b9` — every Supabase call now checks its error:
  - Load failures show an error state with retry (no silent empty list,
    no infinite spinner without a business).
  - Status update/delete failures show a dismissible banner with the DB
    message.
  - Booking form validates staff selection and shows the real save error
    — including database conflict-detection messages
    ("overlaps with an existing appointment").
  - Date/time editing, display, and CSV export now use the **business
    timezone** (new `isoToZonedParts()` helper) instead of the viewer's
    browser timezone.

### M6 — Data truthfulness (Phases 17/18/12)

- `c00c79b`:
  - Dashboard: `totalBookings` and revenue previously came from a
    `.limit(10)` query with an undefined count (KPI always 0; revenue from
    10 rows). Now full datasets; "today" uses an instant range in the
    business timezone (was viewer-local date with no end bound).
  - Analytics: the hardcoded `+12% / +8% / +3% / +5%` KPI trends were fake.
    KPIs now compare the last 30 days with the previous 30 days
    (business timezone); with no prior data the card shows "no prior data"
    instead of an invented percentage. The 7-day chart counted by viewer
    UTC date — now business-timezone dates. Load errors show a retry state
    (was an unhandled rejection → forever spinner).
  - Calendar: the month view rendered **one week** (always
    `startOfWeek..endOfWeek`). Now a full 42-cell month grid (grid math
    unit-tested for all 12 months of 2026); day matching, times, and query
    ranges use business-timezone dates; cancelled/no-show render grey and
    struck through; load error state added.
  - `shiftDate()` added to utils (pure calendar arithmetic).

### M7 — CRUD error handling + booking settings UI (Phases 9/10/11/14/16)

- `95ca6c6` — Customers / Staff / Services / Settings / Notifications:
  - Every page load shows an error state with retry.
  - Every create/update/delete checks its response and shows the real
    database error (banner or inline in the form).
  - Staff form distinguishes "staff created, default hours failed" from a
    full failure; working-hours save reports which step failed.
  - Settings profile save no longer shows "Saved!" on failure.
  - **New Booking tab** (the DB booking engine had no admin UI): booking
    buffer, cancellation notice, reminder lead time, and holiday/closure
    management on the new `holidays` table.
  - Timezone selects (Settings + Onboarding) now offer the **full IANA
    zone list** via `Intl.supportedValuesOf("timeZone")` (was 7 hardcoded
    zones) — Asia/Karachi selectable, nothing hardcoded.
  - Notifications honesty: fake "Active" template badge removed (card now
    states automated delivery is not wired to a provider); "Send" renamed
    "Queue Notification" and states the record is stored as pending;
    insert errors reported.
  - `src/types`: `Business` gains the three booking-settings columns; new
    `Holiday` interface.

### M8 — Plans (Phase 23 + Golden Rule 12)

- `63d1ef7` —
  - Dynamic Tailwind class names (`bg-${color}-50`, `text-${color}-600`)
    replaced with a static class map — the old names are not compiled by
    Tailwind, so those icon tiles rendered unstyled.
  - "Switch to plan" previously wrote `plan + plan_status='active'` with no
    confirmation and no error check, implying a paid change. Now a
    confirmation dialog explicitly states **billing is not connected and no
    payment will be taken**, and DB errors are reported.
  - Prices labeled USD explicitly.

### M9 — Onboarding, i18n mount, env configuration (Phases 3/4/19/22)

- `bd9e601` —
  - `OnboardingWizard.handleFinish` ignored most failures: a failed
    business update still created (duplicate) service/staff and navigated
    home; a failed owner-link left an invisible business with no message.
    Now every step checks its error, reports the real message, stops
    before navigating, and a progress ref makes retries **idempotent**
    (no duplicate business/service/staff on re-run).
  - `I18nProvider`: `<html lang/dir>` applied on mount — a stored
    Arabic/Urdu preference now renders RTL from first paint (was LTR until
    the user changed language mid-session).
  - `__root` error boundary: missing Supabase env vars now produce a
    "Supabase is not configured" screen with the variable names (plus a
    first-paint gate, see M11) instead of a white screen.
  - `.env.example` documents `SUPABASE_SERVICE_ROLE_KEY` (server-only,
    reserved for future background jobs, must never reach the browser).

### M10 — Payments UI (Phase 15)

- `23d4ca7` — Record Payment action on unpaid/partial bookings:
  - Shows total, paid (sum of non-refunded payments), remaining (prefilled).
  - Client-side overpay guard; the DB trigger remains the authority and its
    messages are surfaced verbatim.
  - Method restricted to the table's CHECK values; optional reference.
  - Inserts `status: "paid"`; the derivation trigger updates the booking
    badge after reload.
  - The exact insert shape is covered by the payment test suite
    (G1–G7); full suite re-run: 60/60.

### M11 — Accessibility (Phase 20) + preview (Phases 25–30)

- `82ed24f` — `aria-label` (and `aria-expanded` on toggles) on all
  icon-only buttons: sidebar close, sign out, mobile menu, language, theme
  toggle, and per-row edit/delete/payment/status actions on
  Bookings/Customers/Staff/Services.
- `2f0633d` —
  - `vite.config`: `server.allowedHosts` for the dev-preview proxy host
    (Vite 8 403s unknown Host headers by default — the live preview was
    fully blocked). Dev-server only, no build effect.
  - `__root` `SupabaseConfigGate`: dedicated setup screen on first paint
    (SSR and client) when `VITE_SUPABASE_URL` /
    `VITE_SUPABASE_PUBLISHABLE_KEY` are missing, mirroring the client's
    variable resolution so SSR and client agree.

---

## 3. Final gate results (at `2f0633d`)

| Gate                                | Result                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                  | PASS (0 errors)                                                                                                                 |
| `npm run lint`                      | PASS (0 errors; 11 pre-existing `react-refresh/only-export-components` warnings)                                                |
| `npm run build`                     | PASS                                                                                                                            |
| DB security suite (PostgreSQL 18.4) | **60/60 PASS**                                                                                                                  |
| Timezone helpers (unit)             | all cases pass (incl. DST, cross-midnight, invalid zone)                                                                        |
| Calendar grid math (unit)           | all 12 months of 2026 pass                                                                                                      |
| Dev preview                         | HTTP 200 on the preview host; renders the "Supabase is not configured" setup screen (expected — no credentials in this sandbox) |

## 4. What is NOT verified

1. **Remote Supabase project.** No credentials/CLI in this sandbox. The two
   new migrations must be applied to the real project and the 60-case suite
   re-run there before the security work is considered verified in
   production. Everything in this repo that claims DB behavior is
   local-verified, not remote-verified.
2. **Authenticated flows end-to-end** (sign in, booking, payments UI in the
   browser) cannot be exercised here for the same reason.
3. **Online payments** (Stripe/Paddle) and **notification delivery**
   (email/SMS/push) remain unimplemented — the UI now says so explicitly
   instead of implying otherwise.
4. **Plan limits** remain UI-only; nothing enforces them server-side.
5. Minor known rough edges (documented, not fixed this round):
   - `working_hours` has no unique `(staff_id, day_of_week)` constraint, so
     the schedule save uses delete-then-insert (now with per-step error
     reporting; an upsert would be safer and needs a new migration).
   - i18n covers the existing translation keys and RTL; many page strings
     remain English-only (the i18n infrastructure and RTL work).

## 5. Production readiness

**Not ready for production** until item 4.1 is closed: the migrations are
written, locally verified, and committed, but the security guarantees do not
exist on the live project until they are applied and re-verified there.
Code quality gates (typecheck, lint, build) are green, and the app no longer
contains fake success states, fake trends, dynamic Tailwind classes, or
anonymous write paths — but "ready" would be a false claim while the remote
database is unverified.
