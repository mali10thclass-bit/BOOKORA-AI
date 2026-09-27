# BOOKORA AI — Security

Status: describes implemented controls in this repository (September 2026).
The Supabase migration set has been reviewed statically; live-database
regression execution is **NOT VERIFIED** in this environment (no connected
Supabase project).

## Authorization model

Principle: the LLM is untrusted. It cannot grant itself permissions and cannot
choose a tenant. Every tool execution:

1. Authenticates the caller (`requireSupabaseAuth` — verified JWT, server-side).
2. Resolves the caller's business from `business_members` (server-side). Any
   `business_id` supplied by the client is ignored (registry schemas are
   `.strict()` and reject such fields outright).
3. Gates write actions behind plan entitlements (Pro/Ultimate/Enterprise).
4. Applies the confirmation gate for write actions (propose → human confirm →
   commit; the committed payload is the server-stored proposal, not model text).
5. Executes with an RLS-scoped client (the caller's own session) and/or
   SECURITY DEFINER RPCs that themselves check `is_business_member`.
6. Audits the outcome (`enterprise_audit_logs`, `ai_action_requests`).

Cross-tenant proposal commits are denied and audited (`cross_tenant_proposal`).
Covered by tests in `src/lib/agent-tools/executor-core.test.ts`
("denies committing a proposal from another business").

## Database security (existing, preserved)

- Row Level Security on all AI tables (`ai_agents`, `ai_agent_tools`,
  `ai_agent_tool_runs`, `ai_agent_handoffs`, `ai_action_requests`,
  `ai_knowledge_*`, `ai_conversations`, `ai_messages`, `ai_agent_memories`,
  `ai_agent_deployments`, `ai_agent_eval_*`) with `is_business_member`
  predicates. See migrations `20260924_004` … `20260924_019`.
- SECURITY DEFINER RPCs (`create_ai_action_request`,
  `set_ai_action_request_decision`, `execute_ai_action`,
  `get_available_slots`, `create_public_booking`, `search_ai_knowledge_text`,
  `ai_business_snapshot`) re-check membership or are tenant-keyed; they use
  `SET search_path = public`.
- `public_create_booking` validates service/staff/location ownership, working
  hours, buffers and conflicts; error payloads do not leak SQL internals.
- Earlier hardening (preserved, not modified): `20260913_001_secure_public_booking`,
  `20260917_001_secure_membership_and_public_data`,
  `20260922_003/004/005` (function execute restrictions),
  `20260924_019_ai_security_cleanup`.
- No `WITH CHECK (true)` shortcuts were added; new code adds no policies.

## Prompt injection & data exfiltration

- Layered system prompt with explicit precedence (system > business/agent >
  verified tool results > user input) — `guardrails.buildInjectionHardenedSystemPrompt`.
- Everything not from the system layer (user text, knowledge chunks, memory,
  tool outputs, DB rows) is wrapped in `[[UNTRUSTED_DATA_*]]` markers and
  declared "DATA, not instructions".
- `sanitizeUntrustedData`: redacts secret-shaped strings, neutralizes
  instruction-lookalike lines, truncates oversized payloads.
- `looksLikePromptInjection` heuristics flag classic override attempts (tested:
  "ignore all previous instructions", "reveal your system prompt", jailbreak
  personas). Detection is defense-in-depth, not the security boundary —
  authorization is.
- The system prompt is never sent to the client; tool payloads are summarized
  for the UI (tool activity shows name/status/summary only).
- Public channel (`public-ai-chat`) is read-only: no tools, no customer data,
  hashed deployment keys, origin allowlist, per-minute rate limit.

## Secrets

- All provider keys live in server environment variables (`LOVABLE_API_KEY`,
  `AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, …). `.env.example` uses
  placeholders; `scripts/check-env.mjs` rejects placeholder values.
- `redactSecrets` scrubs key/bearer-shaped strings from anything logged or
  echoed back; `logAiEvent` drops secret-shaped fields entirely.
- `describeAiConfig`/`checkAiProviderHealth` return summaries with
  `apiKeyConfigured: boolean` only — never the key.
- Secret scan performed on the committed diff (see final report): no `.env`,
  keys, tokens or credentials committed.

## Action safety

- Read vs write separation in the registry; only writes mutate state.
- Confirmation required for `create_booking`, `cancel_booking`,
  `reschedule_booking`; proposals expire only by being superseded and cannot be
  committed twice (status checked and transitioned server-side).
- Backend rejections ("Time slot is not available", policy errors) propagate as
  failures — tested ("propagates backend booking rejections instead of
  fabricating success").
- The model is instructed: "Never claim an action was completed unless a
  verified tool result says it was completed."

## Rate limiting & availability

- Public channel: `consume_public_ai_rate_limit` (per-deployment, per-minute).
- Server calls: `AI_TIMEOUT_MS` abort + `AI_MAX_RETRIES` bounded retries.
- Tool loop bounded to 4 steps (`stepCountIs(4)`); tool inputs length-capped.

## Residual risks / known gaps

- `ai_agent_tool_runs` (service-role-only table, used by the edge tool gateway)
  is not writable from the app server path; the app audits via
  `enterprise_audit_logs` + `ai_action_requests` instead. A unifying audit view
  would be a future improvement.
- Live RLS penetration testing against a deployed database is **NOT VERIFIED**
  here; unit tests use a scripted mock. Run the migration suite + manual
  cross-tenant checks against staging before production.
- `set_ai_action_request_decision` permits any business member (not just
  owners) to approve; this matches "the person confirming is a member" for the
  dashboard channel but could be tightened to owner/manager roles later.

---

## STATUS — Production Closure Audit (2026-09-27)

**Legend: IMPLEMENTED / VERIFIED / NOT VERIFIED / DEFERRED**

- Authorization: only OWNER/MANAGER approve/reject AI action requests — **IMPLEMENTED** at DB function level (SECURITY DEFINER, search_path pinned, PUBLIC/ANON execute revoked) + server executor pre-check + pure policy mirror; 15 regression tests **VERIFIED**; live Supabase RLS regression: **NOT VERIFIED** (no credentials)
- Prompt-injection defense (untrusted-data markers, injection detector, system-prompt precedence): **IMPLEMENTED** + **VERIFIED** — closure audit extended detector patterns to cover all 9 required regression phrases (cross-tenant data, auto-approval, role impersonation, authorization bypass, confirmation bypass, credential solicitation, knowledge-override); 18-test security regression suite added
- Secret redaction: **IMPLEMENTED** + **VERIFIED**; closure audit extended `redactSecrets` to GitHub/Slack/GitLab/npm/AWS/Google/Anthropic/JWT token shapes (fixed a real ghp_ leak gap found by the new tests)
- LLM cannot mutate DB directly; writes require stored-proposal commit re-validated server-side: **IMPLEMENTED** + **VERIFIED** (commit path uses stored proposal; model-supplied role/business claims ignored — regression tested)
- Last-owner protections / role-escalation checks against live DB: **NOT VERIFIED** (code + migration preserve the existing guards; live regression requires credentials)
