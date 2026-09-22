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
- [x] CI workflow for TypeScript typecheck and production build

## Next production steps

- [ ] Apply the complete migration set to the real Supabase project and run the remote security/booking verification suite
- [ ] Configure a production TanStack Start hosting provider
- [ ] Configure production environment variables without committing secrets
- [ ] Verify authentication and first-business onboarding against production Supabase
- [ ] Verify two-business tenant isolation against production
- [ ] Verify public booking and availability against production
- [ ] Configure a real AI provider/gateway and verify the business assistant with production-safe data access
- [ ] Configure email/SMS/push providers if those channels are required
- [ ] Add real billing provider integration before allowing paid-plan activation
- [ ] Run end-to-end smoke tests and publish only after the deployment provider reports a successful release

## Explicitly not claimed as live

The repository currently contains no deployment-provider credentials. Until a hosting
provider is configured and reports a successful deployment, the app must not be
described as live or production-verified.
