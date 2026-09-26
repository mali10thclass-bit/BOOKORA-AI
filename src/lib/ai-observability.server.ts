/**
 * BOOKORA AI — observability helpers.
 *
 * Logs only allow-listed metadata (request id, agent id, provider, model,
 * latency, tool name, outcome, error category). Never logs credentials,
 * tokens, raw prompts, or full customer records.
 */

import { randomUUID } from "node:crypto";
import {
  categorizeAiError,
  type AiErrorCategory,
  redactSecrets,
} from "./ai-runtime-config";

export interface AiLogFields {
  requestId?: string;
  agentId?: string | null;
  businessId?: string | null;
  provider?: string;
  model?: string;
  toolName?: string;
  outcome?:
    | "success"
    | "failure"
    | "denied"
    | "confirmation_required"
    | "completed"
    | "proposed"
    | "failed";
  errorCategory?: AiErrorCategory;
  latencyMs?: number;
  extra?: Record<string, string | number | boolean | null>;
}

const MAX_FIELD_LENGTH = 200;

function scrub(value: string | number | boolean | null | undefined): string | number | boolean | null {
  if (typeof value === "string") {
    return redactSecrets(value).slice(0, MAX_FIELD_LENGTH);
  }
  return value ?? null;
}

export function createAiRequestId(): string {
  return randomUUID();
}

/**
 * Single structured line per AI event. Output shape is stable so log
 * collectors can index it; values are redacted and length-bounded.
 */
export function logAiEvent(event: string, fields: AiLogFields = {}): void {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    event: scrub(event),
    requestId: scrub(fields.requestId ?? createAiRequestId()),
    outcome: scrub(fields.outcome ?? null),
    provider: scrub(fields.provider ?? null),
    model: scrub(fields.model ?? null),
    agentId: scrub(fields.agentId ?? null),
    businessId: scrub(fields.businessId ?? null),
    toolName: scrub(fields.toolName ?? null),
    errorCategory: scrub(fields.errorCategory ?? null),
    latencyMs: typeof fields.latencyMs === "number" ? fields.latencyMs : null,
  };
  if (fields.extra) {
    for (const [key, value] of Object.entries(fields.extra)) {
      // Never allow free-form keys that look like secrets.
      if (/key|token|secret|password|credential|authorization/i.test(key)) continue;
      payload[key] = scrub(value);
    }
  }
  // Operational log line, values redacted above.
  console.info(`[bookora-ai] ${JSON.stringify(payload)}`);
}

/** Convenience: wrap an async call with latency + error-category logging. */
export async function withAiObservability<T>(
  event: string,
  fields: AiLogFields,
  fn: (requestId: string) => Promise<T>,
): Promise<T> {
  const requestId = fields.requestId ?? createAiRequestId();
  const started = Date.now();
  try {
    const result = await fn(requestId);
    logAiEvent(event, { ...fields, requestId, outcome: "success", latencyMs: Date.now() - started });
    return result;
  } catch (error) {
    logAiEvent(event, {
      ...fields,
      requestId,
      outcome: "failure",
      errorCategory: categorizeAiError(error),
      latencyMs: Date.now() - started,
    });
    throw error;
  }
}
