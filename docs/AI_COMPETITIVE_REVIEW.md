# BOOKORA AI — AI platform competitive review (September 2026)

This review captures feature patterns observed in public product documentation from business AI/agent platforms. It is a design input, not a ranking of vendors.

## Observed patterns

| Product | Publicly documented capabilities relevant to BOOKORA | BOOKORA implementation direction |
| --- | --- | --- |
| HubSpot custom agents | Agent goal/configuration, data access, knowledge, runtime inputs, web browsing, CRM read/write, MCP integrations, and action-oriented agents. | Agent Studio + knowledge + tools + business-scoped permissions; continue expanding connectors and approval policies. |
| Zendesk AI agents | Knowledge-grounded answers, scripted/dialogue flows, generative procedures, authorized actions, API integrations, escalation, analytics and conversation tracking. | Agent Operations + tool gateway + handoff + evaluation; continue answer inspection and channel workflows. |
| Intercom Fin | Multi-source knowledge, roles, workflow integration, previews/tests, channel deployment, audience targeting, analytics/optimization, and human handoff. | Knowledge/RAG + agent roles + automation + deployments + evaluation; add richer previews, audience rules and channel adapters over time. |

Sources:
- HubSpot Agent Builder — official documentation.
- Zendesk AI overview and AI-agent guidance — official documentation.
- Intercom knowledge sources and Fin workflow/capability guides — official documentation.

## GPU decision

A GPU is not a core requirement for the BOOKORA web application or hosted AI-assistant path.

BOOKORA now supports:
- AI_RUNTIME_MODE=cloud for the existing hosted AI gateway.
- AI_RUNTIME_MODE=local for an OpenAI-compatible local endpoint such as Ollama.
- CPU-first local inference; no CUDA/GPU dependency is required for the normal app/chat path.
- Separate optional Unsloth fine-tuning infrastructure for future adapter training.

Public product documentation for HubSpot, Zendesk and Intercom describes their hosted AI/model capabilities but does not expose the underlying hardware used by their providers. Therefore this review does not claim that those vendors use or do not use GPUs internally.

## Feature parity priorities

1. Knowledge sources with freshness and citations.
2. Agent identity, instructions, roles, tools and permissions.
3. Tool/action gateway with approval requirements.
4. Conversation history and bounded memory.
5. Human handoff and escalation.
6. Preview/evaluation before publishing.
7. Analytics for resolution, failures, latency and usage.
8. Multi-channel deployment adapters.
9. Audience/tenant-aware behavior.
10. Provider-neutral inference so the app is not locked to one model vendor.

The current BOOKORA codebase already contains substantial foundations for these areas, including Agent Studio, Agent Operations, knowledge refresh, evaluation, tool gating, public AI chat, automations and plan entitlements. Future changes should extend those foundations rather than create parallel implementations.
