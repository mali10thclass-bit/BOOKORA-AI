# BOOKORA AI — 25-Phase Productization Program

Research inputs reviewed: Microsoft Agent Framework, Voiceflow, Intercom Fin, HubSpot Breeze/Customer Agent, Meta Business Agent, Boomi Agent Management, and AI-business-OS patterns from bizOS, Bosys, OSOO, 20X, AIBMOS, BizXOS, Novala, Kaanha, Myra, and AIBOS. These are reference patterns only; no proprietary code, text, or assets are copied.

## Phase 01 — Core product integrity
- Preserve tenant isolation, RLS, role protections, booking invariants, and server-side entitlements.
- Remove fake metrics, placeholder success states, and client-only security decisions.

## Phase 02 — Auth and onboarding
- Signup/sign-in, email confirmation, protected routes, business bootstrap, session recovery, onboarding completion.
- Validate every failure state and redirect.

## Phase 03 — Business OS foundation
- Business profile, timezone, currency, locations, working hours, holidays, service/staff limits.
- Centralize business configuration.

## Phase 04 — Booking engine
- Availability, buffers, conflict locks, cancellation policy, timezone correctness, public booking.
- Keep public booking on narrow validated RPCs.

## Phase 05 — CRM
- Customers, notes, history, segmentation, lifecycle state, CSV import/export, deduplication.
- Expose only tenant-scoped records to agents.

## Phase 06 — Staff and services
- Staff schedules, service duration/pricing, assignments, capacity and location constraints.
- Enforce plan limits in database functions.

## Phase 07 — Payments and billing abstraction
- Preserve manual ledger as source of truth.
- Add provider-neutral billing interfaces and webhook/event contracts; no fake online-payment completion.
- Stripe-style customer portal/subscription concepts remain provider adapters, not hard-coded assumptions.

## Phase 08 — Notifications
- Notification templates, event queue, delivery status, retries, provider adapters.
- Email/SMS remain disabled until real provider credentials are configured.

## Phase 09 — Analytics
- Business-timezone KPIs, trends, booking/revenue/customer analytics, export.
- Every metric must be traceable to database records.

## Phase 10 — Knowledge/RAG
- Sources, ingestion, chunking, embeddings, lexical fallback, citations, refresh queue.
- Support files/URLs/text and source freshness.

## Phase 11 — AI assistant
- Grounded business Q&A, no invented numbers, explicit uncertainty, plan gates.
- Keep business snapshot and retrieval separated from generation.

## Phase 12 — Agent Studio
- Agent identity, system guidance, goals, knowledge, tools, schedules, permissions, versions.
- Draft/publish/rollback lifecycle.

## Phase 13 — Agent operations
- Tool gateway, approval queue, action proposals, audit log, retries, failure states, budgets.
- Human-in-the-loop for sensitive actions.

## Phase 14 — Conversations and memory
- Persistent conversations, message history, summaries, customer context, bounded memory.
- Tenant isolation and retention controls.

## Phase 15 — Public AI
- Public deployments, one-time raw-key issuance, key rotation, origin restrictions, rate limiting.
- Public agents must never receive service-role credentials.

## Phase 16 — Omnichannel architecture
- Provider-neutral channel model for web chat, email, messaging and future voice/social adapters.
- Normalize inbound/outbound events before agent execution.

## Phase 17 — Agent workflows
- Triggers, conditions, branches, loops, schedules, retries, checkpoints and resumability.
- Store execution state independently from UI state.

## Phase 18 — Evaluation/quality
- Golden test cases, exact/semantic/regex/length/safety criteria, regression runs, scorecards.
- No model or agent auto-promotion without evaluation.

## Phase 19 — Model intelligence
- Catalog models, capabilities, lifecycle, runtime compatibility, routing and benchmark records.
- Never mark a provider/model runtime-ready without a verified adapter.

## Phase 20 — Unsloth fine-tuning
- Dataset curation, PII/secrets filtering, deterministic hashes, LoRA/QLoRA worker, checkpoints, metrics.
- Training ends in evaluation state; production promotion remains separate.
- Added isolated Python worker and Supabase queue/control plane in migration 023.

## Phase 21 — Continuous improvement
- Feedback -> improvement candidate -> dataset -> training/evaluation -> version -> controlled rollout.
- Keep RAG for changing knowledge and fine-tuning for durable behavior/task patterns.

## Phase 22 — Integrations
- Provider adapters for calendars, payments, CRM, messaging, webhooks and future MCP-compatible tools.
- Secrets stored server-side; least-privilege scopes.

## Phase 23 — PWA/desktop/embedding
- Installable PWA, responsive mobile/desktop UX, embeddable public agent, portable Windows shell.
- Keep the web application authoritative.

## Phase 24 — Security/performance/observability
- RLS, function grants, CSP, origin validation, rate limits, audit logs, structured errors, queue monitoring.
- Index based on measured query patterns; do not blindly delete low-traffic indexes.

## Phase 25 — Release engineering
- Typecheck, lint, build, migration verification, security advisor review, worker health, deployment checks, rollback plan.
- Production status must be based only on actual provider/runtime evidence.

## Reference-derived product principles
- Agent builders should combine knowledge, workflows, tools, memory, evaluation and deployment rather than treating a chatbot as a single prompt.
- Agent actions should be observable, permissioned and optionally human-approved.
- Knowledge freshness and answer quality should be measured independently.
- Shared customer context should connect CRM, conversations, bookings and agent actions.
- Continuous improvement should use a train/test/deploy/analyze loop.
- Multi-channel deployment should normalize events behind one agent runtime.
- AI-business-OS patterns should converge around one operational data layer, unified metrics and governed AI workers.

## Definition of done
A phase is complete only when its implementation exists in code/database, security boundaries are verified, UI paths have real states, and automated checks pass. Documentation alone never marks a phase complete.
