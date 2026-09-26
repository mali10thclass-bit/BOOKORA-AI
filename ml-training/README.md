# BOOKORA AI — Unsloth Fine-Tuning Worker

This directory is the isolated GPU training runtime for BOOKORA AI agents.

## Safety and deployment boundary

Supabase Edge Functions are not used for GPU-heavy Python training. A dedicated worker claims jobs with service-role access, trains an adapter, records metrics, and leaves the job in \`evaluating\`. Production promotion is a separate evaluation-gated step.

Training datasets must be approved before execution and are tenant-scoped. Do not place service secrets or raw provider keys in browser-visible variables.

## Dataset contract

Each example is chat-style JSON:

{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}

The worker validates that every example contains both user and assistant messages and verifies a deterministic dataset hash before training.

## Runtime

Required environment:

- \`BOOKORA_SUPABASE_URL\`
- \`BOOKORA_SUPABASE_SERVICE_ROLE_KEY\`
- \`BOOKORA_WORKER_ID\` (optional)
- \`BOOKORA_TRAINING_OUTPUT_DIR\` (optional)
- \`HF_TOKEN\` (only when the selected base model requires it)

Normal training requires CUDA. CPU mode is intentionally not the default and must never be treated as production evidence.

## Alternatives considered

Unsloth is the primary execution engine. LLaMA-Factory remains a fallback when its broader model/agent-tuning surface is useful, and PyTorch torchtune is an escape hatch for lower-level recipe control. TRL provides the training abstraction used by the worker.

Do not maintain multiple independent production trainers until a real compatibility gap is demonstrated.
