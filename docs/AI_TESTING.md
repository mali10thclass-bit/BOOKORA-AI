# BOOKORA AI — Testing & Evaluation

Status: every command below was executed in this repository. Results are
reproducible with `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Test stack

- Runner: **vitest 5** (`npm test` → `vitest run`), node environment.
- Config: `vitest.config.ts` (includes `src/**/*.test.ts`).
- Design: deterministic — no network, no database, no GPU, no live model calls.
  Supabase interactions are exercised through a scripted mock client.

## Unit/integration suite (65 tests, 5 files)

| File | Covers |
| --- | --- |
| `src/lib/ai-runtime-config.test.ts` (22) | provider selection (`AI_PROVIDER`/`AI_RUNTIME_MODE`), `LOCAL_AI_*` precedence, endpoint validation, timeout/retry clamping, error categorization (401/403/429/5xx/abort/network), secret redaction, secret-free config summaries |
| `src/lib/agent-tools/registry.test.ts` (11) | registry integrity, read vs write confirmation metadata, public-channel exposure rules (no writes/customers/bookings), schema strictness (rejects smuggled `business_id`, `role`, bad UUIDs/dates/emails), length bounds |
| `src/lib/agent-tools/guardrails.test.ts` (13) | injection detection (override/reveal/jailbreak patterns; ordinary text not flagged), untrusted-data markers, sanitization (secret redaction, instruction neutralization, truncation), layered system-prompt precedence, read-only mode |
| `src/lib/agent-tools/eval-scoring.test.ts` (7) | deterministic criteria scoring: exact/contains/regex/max_length/must_not_contain, proportional scoring, fail-closed on empty criteria, invalid regex tolerance |
| `src/lib/agent-tools/executor-core.test.ts` (12) | unknown-tool denial, invalid-args rejection (no DB calls), plan gating for writes, tenant-scoped availability via backend RPC, cross-tenant booking non-leak, propose flow without mutation, commit flow (approve + execute), cross-tenant proposal denial, double-use rejection, backend rejection propagation, cancellation notice policy |

Regression cases explicitly covered (from the required checklist):

- cross-tenant access attempt → "denies committing a proposal from another
  business", "does not leak a booking from another business"
- unauthorized action → "denies write actions on plans without AI operations"
- invalid tool arguments → "rejects invalid tool arguments before any execution"
- hallucinated availability → slots come only from the RPC; "Never invent"
  note asserted; backend rejections cannot become successes
- prompt injection → guardrails tests
- human handoff → handoff is a non-confirmation tool in the registry tests
  (flow itself covered by executor handoff handler + UI)

## Running tests

```sh
npm install
npm test           # vitest run — 65 tests
npx tsc --noEmit   # typecheck
npm run lint       # eslint
npm run build      # production build
npm run env:check  # environment validation (needs a .env)
```

Note: `vitest` is a devDependency in `package.json`; `bun.lock` was not
regenerated in this environment (bun unavailable) — run `bun install` once to
sync the lockfile.

## Agent evaluation (runtime, per-business)

Beyond unit tests, businesses can evaluate their configured agent:

1. Create cases in `ai_agent_eval_cases` (input + `expected_criteria` JSON).
2. Start a run (`ai_agent_eval_runs`) and call `runAgentEvaluation`
   (Agent Operations UI → Evaluation).
3. Each case is answered with the configured provider (cloud or local) and
   scored deterministically by `agent-tools/eval-scoring.ts`; results land in
   `ai_agent_eval_results` with per-case feedback and an aggregate score.

Criterion schema: `{ exact?, contains_any?, contains_all?, regex?, max_length?,
must_not_contain? }` — all case-insensitive except `exact`; no criteria →
score 0 (fail closed).

## Integration / live checks

- Provider health: `checkAiProviderHealth` (Agent Operations → provider panel).
- End-to-end chat/tool flow against a live Supabase + provider: **NOT VERIFIED**
  in this environment (no connected backend or model endpoint). The executor
  tests mock the Supabase client; run staging smoke tests after deploy:
  ask availability → propose booking → confirm → verify row in `bookings`;
  attempt a cross-tenant proposal id; cancel inside notice window.

## What is intentionally not built

- No external evaluation SaaS, no LLM-as-judge dependency, no paid testing
  service — the criteria scorer is local and deterministic.
- No load/perf test harness yet (candidates: autocannon against the server
  functions; token/latency metrics are logged for manual review).
