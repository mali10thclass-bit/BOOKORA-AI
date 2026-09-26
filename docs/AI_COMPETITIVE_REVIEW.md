# BOOKORA AI — Competitive Review (September 2026)

Design input only: publicly documented product patterns from official vendor
documentation, extracted as general concepts. No proprietary code, branding, or
data is copied. Sources inspected (September 2026):

- HubSpot — *Create and customize agents in the agent builder*
  (knowledge.hubspot.com/ai/create-and-customize-agents-in-the-agent-builder)
- Zendesk — *AI Agents* developer documentation
  (developer.zendesk.com/documentation/ai-agents/) and AI-agent resources
  (support.zendesk.com/hc/en-us/articles/4408834322842)
- Intercom — *Fin AI Agent explained* (intercom.com/help/en/articles/7120684),
  Fin deployment/testing (…/8286630), Fin developer API
  (developers.intercom.com/docs/guides/fin-agent-api)
- Ollama — *OpenAI compatibility* (github.com/ollama/ollama →
  docs/api/openai-compatibility.mdx)

## Pattern-by-pattern review

### Knowledge systems
- **Observed**: HubSpot agents bind to CRM/content data; Intercom Fin trains
  from multi-source content libraries (help center, internal content, PDFs,
  webpages) with audience targeting; Zendesk knowledge-grounded answers.
- **BOOKORA**: `ai_knowledge_sources` + `ai_knowledge_chunks` (pgvector) +
  `search_ai_knowledge_text` retrieval with citations metadata, refresh queue
  (`ai_knowledge_refresh_jobs`, embed-knowledge worker). Tenant isolation via
  RLS. Per-audience content targeting: **deferred**.

### Agent instructions
- **Observed**: HubSpot agent builder defines goal, instructions, data access,
  response style; Intercom "Guidance" (custom instructions) + tone of voice;
  Zendesk scripted flows/generative procedures.
- **BOOKORA**: layered prompt stack (system > agent/business > tool rules >
  safety) in `guardrails.buildInjectionHardenedSystemPrompt`, persisted agent
  `system_prompt`/`config`/tone in `ai_agents`. Explicit precedence prevents
  instruction override.

### Actions / tools
- **Observed**: HubSpot agents take actions on CRM records with defined data
  access; Zendesk "authorized actions" + API integrations + webhooks; Fin
  Procedures (document-style tool steps) and Data connectors.
- **BOOKORA**: controlled tool registry (12 tools) with strict schemas,
  confirmation-gated write actions, backend-authoritative booking execution.
  External connectors / custom code tools / MCP: **deferred**.

### Permissions
- **Observed**: HubSpot AI settings govern feature access and shared data;
  Zendesk API-key scopes; Fin roles/permissions per workflow.
- **BOOKORA**: server-side authorization from session + `business_members`,
  RLS everywhere, plan entitlement gating per tool class, strict schemas that
  reject client-supplied tenant/role fields. Model-generated permission claims
  are never trusted (they are not part of the protocol).

### Workflows
- **Observed**: Zendesk conversation flows + triggerable backend actions;
  Fin Procedures/Tasks; HubSpot record-driven automation.
- **BOOKORA**: propose → human confirm → commit action pipeline
  (`ai_action_requests`), existing automation workers/webhooks
  (`automation-worker`, `webhook-worker`), agent schedules
  (`ai_agent_schedules`). Visual workflow builder: **deferred**.

### Testing
- **Observed**: Intercom "test before going live" previews; Zendesk sandbox
  APIs for conversation tuning.
- **BOOKORA**: deterministic vitest suite (65 tests) + per-agent evaluation
  cases/runs with deterministic criteria. Preview/sandbox channel: **deferred**.

### Evaluation
- **Observed**: Fin tracks resolution quality and offers AI-powered content
  Suggestions; Zendesk analytics APIs for conversation data.
- **BOOKORA**: `ai_agent_eval_cases/runs/results` with deterministic scoring
  (`eval-scoring.ts`, fail-closed), `ai_agent_evaluations` runtime grounding
  records. LLM-as-judge scoring: intentionally not adopted (cost, non-
  determinism); Suggestions-style auto-content-improvement: **deferred**.

### Human handoff
- **Observed**: Fin escalates to humans with conversation context (dedicated
  escalation model in their stack); Zendesk escalations with full context.
- **BOOKORA**: `request_human_handoff` tool + `ai_agent_handoffs` (reason,
  conversation, agent summary, status flow pending→accepted→resolved),
  chat UI handoff button, operations queue. Routing rules per team/queue:
  **deferred**.

### Analytics
- **Observed**: all three expose conversation/resolution analytics.
- **BOOKORA**: `getAiAgentAnalytics` from real stored rows + `AiOpsPanel`;
  provider latency/error-category logging. Historical trend dashboards:
  **deferred**.

### Deployment & channels
- **Observed**: Fin deploys across messenger, email, social, API; Zendesk
  widget integrations + custom channels; HubSpot inbox surfaces.
- **BOOKORA**: dashboard channel (authenticated chat), public web/embed channel
  (`public-ai-chat` with hashed keys, origin allowlist, rate limiting), API/
  workflow deployment rows (`ai_agent_deployments`). Email/WhatsApp/voice:
  **deferred** (would require external paid providers).

### Memory
- **Observed**: Fin personalizes via identity attributes/custom data
  attributes; Zendesk stores session parameters/metadata.
- **BOOKORA**: short-term conversation context + tenant-scoped
  `ai_agent_memories`; database state always authoritative. Automatic memory
  extraction: **deferred**.

### Safety
- **Observed**: Fin's retrieval stack aims to avoid hallucinations; HubSpot AI
  trust settings; Zendesk scoped API keys.
- **BOOKORA**: injection-hardened prompt layers, untrusted-data wrapping,
  secret redaction, confirmation-gated writes, backend validation, no raw
  error/stack leakage, rate limits. See AI_SECURITY.md.

### Observability
- **Observed**: Zendesk conversation-data APIs for compliance/reporting.
- **BOOKORA**: structured redacted event log (request id, latency, error
  category), audit tables. External APM integration: **deferred**.

## Feature parity priorities (updated)

1. ✅ Knowledge sources with freshness and citations.
2. ✅ Agent identity, instructions, roles, tools and permissions.
3. ✅ Tool/action gateway with approval requirements.
4. ✅ Conversation history and bounded memory.
5. ✅ Human handoff and escalation.
6. ✅ Preview/evaluation before publishing (deterministic eval runs).
7. ✅ Analytics for resolution, failures, latency and usage.
8. ◐ Multi-channel deployment (dashboard + public web/embed done; email/chat
   apps deferred).
9. ✅ Tenant-aware behavior.
10. ✅ Provider-neutral inference (Lovable / Ollama / OpenAI-compatible).

## GPU decision (unchanged)

A GPU is not a requirement for the BOOKORA web application or hosted AI path.
`AI_PROVIDER=ollama` gives CPU-first local inference (default `qwen-1.5b`);
cloud providers remain first-class. Vendor docs reviewed here describe hosted
AI capabilities but do not disclose provider hardware; no claims are made
about their infrastructure. Optional Unsloth fine-tuning stays isolated from
application startup (see AI_DEPLOYMENT.md).

## Features requiring external paid services (not adopted)

- WhatsApp/SMS/voice channels (Twilio-type providers).
- Third-party ticketing/CRM connectors.
- Hosted vector DBs (not needed — Supabase pgvector).
- LLM-based evaluation judges and moderation APIs.
