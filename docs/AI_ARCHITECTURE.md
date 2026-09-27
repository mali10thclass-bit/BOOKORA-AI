# BOOKORA AI — Architecture

Status: describes the implementation in this repository as of September 2026.
Anything not verified in this environment is explicitly marked **NOT VERIFIED**.

## Overview

BOOKORA AI Agent 2.0 is the assistant layer inside the BOOKORA booking SaaS. The
pipeline is:

```
USER → CHAT (BusinessAssistant UI)
     → askBusinessAssistant (server fn, session-authenticated)
     → business context (business_members — server-resolved, never client-provided)
     → knowledge retrieval (search_ai_knowledge_text) + memory (ai_agent_memories)
     → layered system prompt (guardrails.buildInjectionHardenedSystemPrompt)
     → model (configured provider) with bounded tool loop (max 4 steps)
     → tool request → schema validation → authorization → confirmation gate
     → backend execution (Supabase RPC / RLS-scoped queries)
     → result validation → untrusted-data wrapping back to model
     → final answer + tool activity + pending confirmation to UI
     → audit (enterprise_audit_logs, ai_action_requests) + analytics
```

The LLM never mutates the database. It can only *request* registered tools; the
server validates arguments, resolves authorization from session/database
context, and executes against backend functions that are the final authority
(availability, booking conflicts, cancellation policy).

## Provider layer

Two modules:

- `src/lib/ai-runtime-config.ts` — pure configuration model (unit-tested):
  provider selection, model selection, endpoint resolution, timeout/retry
  bounds, error categorization, secret redaction.
- `src/lib/ai-gateway.server.ts` — provider factory (`createBusinessAiChatModel`),
  structured `AiProviderError`, retry policy (`getAiRetryPolicy`), and a live
  health probe (`checkAiProviderHealth`, GET `{baseUrl}/models` with timeout).

Providers (server-side configuration only):

| `AI_PROVIDER` | Backend | Notes |
| --- | --- | --- |
| `lovable` (default cloud) | Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1`) | existing gateway; Responses-style options supported |
| `ollama` (or `AI_RUNTIME_MODE=local`) | `http://127.0.0.1:11434/v1` by default | CPU-first; Ollama ignores the API-key placeholder |
| `openai-compatible` | any OpenAI-compatible endpoint | requires `AI_BASE_URL` + `AI_API_KEY` |

Selection order: `AI_PROVIDER` (explicit) → `AI_RUNTIME_MODE` (legacy) →
cloud default. Model: `AI_MODEL` → `LOCAL_AI_MODEL`/`AI_LOCAL_MODEL` (local) →
built-in defaults (`openai/gpt-4o-mini` cloud, `qwen-1.5b` local). Timeouts
(`AI_TIMEOUT_MS`, clamped 1s–300s) and retries (`AI_MAX_RETRIES`, clamped 0–5)
are enforced at call sites via `AbortSignal.timeout` and the AI SDK `maxRetries`.

Ollama's OpenAI-compatible API (`/v1/chat/completions`, `/v1/models`) is used
exactly as documented by Ollama: an API key value is supplied but ignored by a
standard local server. GPU/CUDA is never required.

## Tool layer

- `src/lib/agent-tools/registry.ts` — 12 tools (pure definitions + zod schemas):
  8 read tools (`get_business_info`, `get_services`, `get_staff`,
  `get_business_hours`, `get_available_slots`, `get_booking`,
  `search_customers`, `search_knowledge`), 3 write actions (`create_booking`,
  `cancel_booking`, `reschedule_booking`), 1 handoff (`request_human_handoff`).
  Each declares kind, confirmation requirement, and channel exposure
  (public channel never sees write tools, customers, or bookings).
- `src/lib/agent-tools/guardrails.ts` — injection heuristics, untrusted-data
  markers (`[[UNTRUSTED_DATA_BEGIN/END]]`), output sanitization (secret
  redaction, instruction-lookalike neutralization, size caps), layered system
  prompt with explicit precedence.
- `src/lib/agent-tools/executor-core.server.ts` — the only path to execution:
  schema validation → server-resolved business context → plan gate →
  confirmation gate → execution → audit.

Write actions use a propose → confirm → commit flow built on existing tables:

1. Propose: `create_ai_action_request(...)` (SECURITY DEFINER, membership
   checked) stores the validated proposal; the tool returns
   `confirmation_required` with the request id.
2. Confirm: the UI confirm card calls `executeAgentTool(mode:"commit")`.
3. Commit: the server re-loads the stored proposal (same business, matching
   action type, still pending), approves it via
   `set_ai_action_request_decision`, then executes:
   - `create_booking` → `create_public_booking` RPC (validates service/staff/
     location scoping, working hours, buffers, conflicts; returns explicit
     error payloads that are propagated, never converted to success)
   - `cancel_booking` → RLS-scoped update after cancellation-notice policy check
     (DB trigger `enforce_booking_rules` remains a second line of defense)
   - `reschedule_booking` → requested slot must appear in `get_available_slots`
     output before the RLS-scoped update.

## Knowledge

Existing RAG foundation (extended, not replaced):

- `ai_knowledge_sources` — tenant-scoped sources with status/ownership.
- `ai_knowledge_chunks` — chunked content with pgvector embeddings (384 dims).
- `search_ai_knowledge_text` — tenant-scoped retrieval RPC used by both the
  assistant snapshot and the `search_knowledge` tool.
- `ai_knowledge_refresh_jobs` + `embed-knowledge` / `ai-knowledge-refresh-worker`
  edge functions — indexing/refresh queue.

Retrieved knowledge is always wrapped as untrusted data before entering the
model context; it can never redefine system or business rules.

## Memory

- Short-term: recent `ai_messages` for the conversation (bounded to 20) are
  included in the business snapshot.
- Long-term: `ai_agent_memories` (fact/event/instruction/task/preference),
  tenant-scoped, confidence-scored, bounded to 40 recent rows.
- The database is authoritative: memory content is untrusted data and cannot
  override verified tool/database results (system prompt precedence rules).

## Conversations and channels

- Dashboard channel: `BusinessAssistant` component (AI Assistant page,
  Analytics page, Agent Studio) via `askBusinessAssistant`.
- Public channel: `public-ai-chat` edge function (deployment key hashed,
  origin allowlist, per-minute rate limit, public snapshot + knowledge only,
  no tools). Public chat is read-only by design.
- Agent configuration, tools, handoffs, deployments and evaluation live under
  Agent Studio (`src/pages/AIAgentStudio.tsx`) and Agent Operations
  (`src/pages/AIAgentOperations.tsx`).

## Observability

`src/lib/ai-observability.server.ts` logs one structured, redacted JSON line
per AI event: request id, agent id, business id, provider, model, tool name,
outcome, error category, latency. Secret-shaped keys are dropped and values are
redacted/length-bounded. No prompts, tokens, or customer payloads are logged.

## Analytics

`getAiAgentAnalytics` (src/lib/ai-ops.functions.ts) derives counts strictly
from stored rows: `ai_conversations`, `ai_messages`, `ai_agent_handoffs`,
`ai_action_requests`, `ai_agent_evaluations`, `ai_agent_eval_runs`,
`ai_knowledge_sources`, and `enterprise_audit_logs` (tool audit actions).
Rendered in the Agent Operations page (`AiOpsPanel`).

## CPU-first guarantee

Normal application operation requires no GPU, CUDA, cuDNN or TensorRT. Local
inference is optional (Ollama/OpenAI-compatible, CPU-friendly default model
`qwen-1.5b`). Optional fine-tuning infrastructure (`ml-training/`, Unsloth
pipeline migrations) is isolated from application startup.
