# BOOKORA AI roadmap

## Completed / in repository

- [x] Repository recovery to `main`
- [x] Authentication, onboarding and protected application routes
- [x] Dashboard, bookings, calendar, customers, staff and services
- [x] Public booking flow with server-side validation
- [x] Business timezone, working-hours, buffer, holiday and conflict validation
- [x] Manual payment ledger and payment-status integrity
- [x] Business-scoped RLS and membership/role hardening
- [x] Free / Pro / Ultimate database plan limits and feature entitlement helper
- [x] AI assistant UI and Pro/Ultimate entitlement gate
- [x] GitHub Actions CI for TypeScript typecheck and production build

## Current production blockers

- [ ] Apply the complete migration set to the real Supabase project and run the remote security/booking verification suite
- [ ] Configure production environment variables without committing secrets
- [ ] Configure a production TanStack Start hosting provider
- [ ] Verify authentication and first-business onboarding against production Supabase
- [ ] Verify two-business tenant isolation against production
- [ ] Verify public booking and availability against production
- [ ] Configure and verify the Lovable AI Gateway/API key for the AI assistant
- [ ] Configure email/SMS/push providers if those channels are required
- [ ] Add real billing-provider integration before enabling paid-plan activation
- [ ] Run end-to-end smoke tests and publish only after the deployment provider reports a successful release

## Access required for live deployment

The repository itself does not contain hosting or production Supabase credentials. If a connected
deployment/Supabase provider asks for authorization, authorize the provider for this BOOKORA-AI
project only. Never paste service-role, billing, or other private secrets into source files.

## Explicitly not claimed as live

Until a hosting provider reports a successful deployment and the production URL is verified,
the application must not be described as live or production-verified.
