# BOOKORA AI — optional Unsloth fine-tuning worker

This directory is an optional training runtime for BOOKORA AI agents. It is not required to run the web app, AI assistant, public AI chat, Agent Studio, or normal agent operations.

## Runtime boundary

- Normal BOOKORA AI inference can run through the hosted AI gateway.
- Normal local inference can run CPU-first through an OpenAI-compatible local endpoint such as Ollama.
- CUDA/GPU is only relevant when running the optional fine-tuning worker with a compatible training stack.
- Do not block application deployment, chat, booking, or business operations on GPU availability.
- Never treat an unexecuted training job as production evidence.

Supabase Edge Functions are not used for GPU-heavy Python training. A dedicated worker claims approved jobs with service-role access, trains an adapter, records metrics, and leaves the job in evaluating. Production promotion is a separate evaluation-gated step.

Training datasets must be approved before execution and tenant-scoped. Do not place service secrets or raw provider keys in browser-visible variables.

## Dataset contract

Each example is chat-style JSON:

{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}

The worker validates that every example contains both user and assistant messages and verifies a deterministic dataset hash before training.

## Runtime

Required environment for the training worker:

- BOOKORA_SUPABASE_URL
- BOOKORA_SUPABASE_SERVICE_ROLE_KEY
- BOOKORA_WORKER_ID (optional)
- BOOKORA_TRAINING_OUTPUT_DIR (optional)
- HF_TOKEN (only when the selected base model requires it)

Normal application inference does not require these training variables.

## Alternatives considered

Unsloth is the optional training engine. LLaMA-Factory and torchtune remain alternatives for future compatibility gaps; they are not required by the normal application runtime. TRL provides the training abstraction used by the worker.

Do not maintain multiple independent production trainers until a real compatibility gap is demonstrated.
