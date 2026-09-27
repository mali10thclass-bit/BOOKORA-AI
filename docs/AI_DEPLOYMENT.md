# BOOKORA AI — Deployment

Status: local build/typecheck/test/lint verified in the sandbox; production
deployment is **NOT VERIFIED** and is not claimed here.

## Environment variables

Client-safe (browser):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable/anon key |
| `VITE_SUPABASE_PROJECT_ID` | project id |

Server-only (never exposed to browser code):

| Variable | Purpose | Default |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server Supabase client | — |
| `SUPABASE_SERVICE_ROLE_KEY` | workers/edge only (bypasses RLS) | — |
| `AI_PROVIDER` | `lovable` \| `ollama` \| `openai-compatible` | derived from `AI_RUNTIME_MODE` |
| `AI_RUNTIME_MODE` | legacy switch: `cloud` \| `local` | `cloud` |
| `AI_MODEL` | model override | provider default |
| `AI_BASE_URL` | endpoint (required for `openai-compatible`) | gateway/local default |
| `AI_API_KEY` | key for `openai-compatible` | — |
| `LOVABLE_API_KEY` | Lovable AI Gateway key (cloud default) | — |
| `LOCAL_AI_BASE_URL` (alias `AI_LOCAL_BASE_URL`) | local endpoint | `http://127.0.0.1:11434/v1` |
| `LOCAL_AI_MODEL` (alias `AI_LOCAL_MODEL`) | local model | `qwen-1.5b` |
| `AI_LOCAL_API_KEY` (alias `LOCAL_AI_API_KEY`) | local key if required | `ollama` placeholder |
| `AI_TIMEOUT_MS` | per-request timeout (1000–300000) | 30000 (60000 local) |
| `AI_MAX_RETRIES` | retry budget (0–5) | 2 |
| `BOOKORA_WORKER_SECRET` | edge worker auth | — |

`.env.example` is the canonical template. `npm run env:check` validates the
required values, provider consistency and numeric bounds. Never commit `.env`.

## Local development

```sh
npm install            # or bun install (lockfile: bun.lock)
cp .env.example .env   # fill in Supabase values
npm run dev            # vite dev server
```

Local AI (optional, CPU-first):

```sh
# Terminal 1: Ollama (or any OpenAI-compatible server) — no GPU required
ollama serve
ollama pull qwen-1.5b
# Terminal 2: app in local mode
AI_RUNTIME_MODE=local npm run dev
```

The app works without any AI provider configured: AI surfaces return controlled
"AI is not configured" messages; everything else functions.

## Production

- Target: Vercel/Nitro (`vercel.json`, `nitro` build output) + Supabase.
- Set `AI_PROVIDER=lovable` (or `openai-compatible` + `AI_BASE_URL`/`AI_API_KEY`)
  in the host's secret store. Do **not** point production at
  `127.0.0.1:11434` unless the deployment architecture intentionally runs a
  co-located model server; local mode is a development/single-machine setup.
- Supabase edge functions (`supabase/functions/*`) take `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEYS`, `LOVABLE_API_KEY`,
  `BOOKORA_WORKER_SECRET` from the Supabase secrets store.
- Apply `supabase/migrations` in order (Supabase CLI or dashboard). New AI
  migrations added in this effort: none — the implementation is compatible
  with the existing schema.
- CI: `.github/workflows/ci.yml` (typecheck/lint/build), `ai-workers.yml`
  (worker dispatch), `build-portable-agent.yml` (Windows portable agent).

## CPU-first requirement (enforced)

- No CUDA/GPU dependency anywhere in `package.json` or app startup.
- Default local model `qwen-1.5b` runs on CPU.
- GPU use is confined to optional, separately-started training
  (`ml-training/` + Unsloth migrations); the web app never imports it.

## Windows workflow

`scripts/install-windows.ps1` builds a local production bundle without
embedded credentials (`docs/INSTALL_WINDOWS.md`). Verified only in the sense
that scripts are present and referenced; full Windows execution is **NOT
VERIFIED** in this Linux sandbox.

## Deployment checklist

1. `npm run env:check` passes against the target `.env`.
2. `npm test && npx tsc --noEmit && npm run lint && npm run build` pass.
3. Supabase migrations applied; RLS regression checks executed on staging
   (see AI_SECURITY.md residual risks).
4. Provider health probe green in Agent Operations.
5. Smoke test: dashboard chat, availability lookup, propose→confirm booking,
   handoff, public chat rate limit.

---

## STATUS — Production Closure Audit (2026-09-27)

**Legend: IMPLEMENTED / VERIFIED / NOT VERIFIED / DEFERRED**

- Deployment readiness: Vercel + Supabase + AI provider env documented — **IMPLEMENTED** (docs + `.env.example` + `scripts/check-env.mjs`)
- LOCAL: AI provider over `http://localhost:11434/v1` (Ollama, CPU-first) is an explicitly local-only default; never a production endpoint — CPU-first inference only, no GPU/CUDA dependencies introduced
- STAGING/PRODUCTION readiness: **NOT VERIFIED** (no deployment performed in the closure environment; no secrets available). Production secrets must be set via the deployment secret store; never commit .env files
- Live Supabase security regression (RLS, tenant isolation, SECURITY DEFINER, search_path): **NOT VERIFIED** (no credentials); migration `supabase/migrations/20260927_001_restrict_ai_action_decisions.sql` ready for `supabase db push`
- PWA/Windows helper scripts in `scripts/` are developer convenience only and are not part of the production web deployment
