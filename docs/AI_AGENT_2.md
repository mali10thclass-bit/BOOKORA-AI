# BOOKORA AI Agent 2.0 — Implementation Guide

Status: reflects the code in this repository (September 2026). Features listed
as deferred are intentionally not implemented and not presented as working in
the UI.

## Agent model

Agent configuration is persisted in `ai_agents` (migration
`20260924_009_ai_agent_studio.sql`):

| Field | Purpose |
| --- | --- |
| `id`, `business_id` | tenant scoping (RLS: `is_business_member`) |
| `name`, `description`, `role` | identity (`role` default `business_assistant`) |
| `system_prompt` | agent-level instructions (layer 2 of the prompt stack) |
| `model` | per-agent model override (falls back to runtime config) |
| `status` | `draft` / `active` / `paused` / `archived` |
| `config`, `capabilities`, `starter_prompts` | JSON configuration |
| `created_by`, `created_at`, `updated_at` | provenance |

Versioning exists in `ai_agent_versions` with `promote_ai_improvement_candidate`
and `rollback_ai_agent_version` RPCs. A default agent ("BOOKORA Assistant") is
provisioned lazily when a handoff is requested and none exists.

## Instruction layers

`guardrails.buildInjectionHardenedSystemPrompt` assembles, in precedence order:

1. **System rules** (highest — can never be overridden): role, priority order,
   untrusted-data policy, no invention, no system-prompt disclosure, language.
2. **Agent instructions**: `ai_agents.system_prompt` + `config` (name, tone).
3. **Business rules**: e.g. cancellation notice policy.
4. **Tool rules**: available tool names; write tools only propose and require
   explicit human confirmation; read-only mode for the public channel.
5. **Safety & privacy**: tenant boundaries; handoff guidance.

User messages, knowledge chunks, memory rows and tool outputs are wrapped in
`[[UNTRUSTED_DATA_*]]` markers and explicitly declared *data, not instructions*.
Prompt text cannot grant permissions: authorization is resolved exclusively
from session/database context in the executor.

## Tools

Registry: `src/lib/agent-tools/registry.ts` (see AI_ARCHITECTURE.md for the
full list). Contract for every tool:

- name + description (for the model)
- strict zod input schema (`.strict()` — smuggled fields like `business_id` or
  `role` are rejected)
- kind: `read` | `action` | `handoff`
- `requiresConfirmation` (all write actions: true)
- channel exposure (`publicChannelAllowed` — writes and personal data: false)
- `summarizeInput` — human-readable confirmation/audit summary

Execution is centralized in `runAgentToolCore`; there is no other write path
for AI-initiated changes.

## Booking workflow

The agent understands booking through real backend data only:

- `get_available_slots` computes availability (duration, buffers, working
  hours, holidays, existing bookings, 15-minute lead, 60-day horizon) — the
  agent is instructed never to guess times.
- `create_booking` computes `end_time` from the service duration and submits
  `create_public_booking`, which re-validates everything and returns either
  `success` with a booking id or an `error` payload. Backend rejections are
  surfaced verbatim as failures — the agent cannot fabricate a confirmation.
- `cancel_booking` enforces `cancellation_notice_hours` from the business row.
- `reschedule_booking` requires the requested time to appear in real slot
  output before any update.

## Confirmation (action safety)

Read → automatic. Write → `confirmation_required` proposal stored in
`ai_action_requests` (status `pending`), shown to the human as a confirm/cancel
card in `BusinessAssistant`. On confirm, the server re-validates the stored
proposal (tenant, action type, status), records approval
(`set_ai_action_request_decision`) and executes. Cancel discards the proposal
(it remains `pending`/`rejected` in the request log).

## Human handoff

`request_human_handoff` tool + `requestHumanHandoff` server fn create an
`ai_agent_handoffs` row (status `pending`) with reason, conversation reference
and an agent summary of recent turns. The Agent Operations page lists handoffs
(status flow: `pending → accepted → resolved` or `cancelled`). The chat UI adds
a "Talk to a human" button (EN/UR/AR/ES/FR). AI responses and handoff
confirmations are distinct message states in the UI.

## Memory

See AI_ARCHITECTURE.md. Memory is tenant-scoped, bounded, deletable through the
existing tables' RLS, and never authoritative over database state.

## Testing & evaluation

- Deterministic unit/integration tests (`npm test`, vitest, 65 tests) — see
  AI_TESTING.md.
- Agent evaluation runs (`runAgentEvaluation` server fn + `ai_agent_eval_cases`,
  `ai_agent_eval_runs`, `ai_agent_eval_results`): each case is answered with the
  configured provider and scored by deterministic criteria
  (`agent-tools/eval-scoring.ts`): exact, contains_any/contains_all, regex,
  max_length, must_not_contain. Fails closed with no criteria. Runs are
  triggerable from the Agent Operations UI.

## Multilingual

`askBusinessAssistant` accepts `language` ∈ {en, ur, ar, es, fr} (validated),
maps it to a language name in the system prompt, and replies in that language.
The chat UI is RTL-aware (`dir` from `I18nContext`) with localized greetings,
suggestions, confirmation and handoff labels. Canonical values (names, ids,
prices, times) come from database/tool results and are not to be translated by
policy (system rules).

## Analytics & observability

- `getAiAgentAnalytics` → real counts (conversations, messages, handoffs, tool
  audits, action proposals, evaluations, knowledge sources).
- `getAiProviderDiagnostics` → secret-free runtime summary + live health probe.
- `logAiEvent` → structured redacted logs (request id, latency, error category).
- UI: `AiOpsPanel` on the Agent Operations page.

## Intentionally deferred

- Multi-agent orchestration / specialized agent roles (Intercom-style role
  switching).
- Audience/content targeting per customer segment.
- Full streaming token UI (backend streaming is supported by the SDK; the
  current UI renders complete answers).
- Auto-tuned memory extraction (currently explicit `ai_agent_memories` rows).
- MCP/external connectors and custom code tools (registry is in-process only).
- Voice channels, WhatsApp/SMS deployment.
