import { createOpenAI } from "@ai-sdk/openai";
import {
  AI_DEFAULTS,
  categorizeAiError,
  describeAiConfig,
  resolveAiBaseUrl,
  resolveAiRuntimeConfig,
  toSafeAiErrorMessage,
  type AiRuntimeConfig,
  type AiRuntimeMode,
} from "./ai-runtime-config";
import { logAiEvent } from "./ai-observability.server";

export type { AiRuntimeMode };

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** Structured, secret-free provider failure. */
export class AiProviderError extends Error {
  readonly category: ReturnType<typeof categorizeAiError>;
  readonly userMessage: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiProviderError";
    this.category = categorizeAiError(options?.cause ?? message);
    this.userMessage = toSafeAiErrorMessage(this.category);
  }
}

export function getAiRuntimeConfig(): AiRuntimeConfig {
  return resolveAiRuntimeConfig();
}

export function getAiRuntimeMode(): AiRuntimeMode {
  return getAiRuntimeConfig().mode;
}

export function getAiRuntimeModel(fallback = AI_DEFAULTS.cloudModel): string {
  return resolveAiRuntimeConfig().model || fallback;
}

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      const next = response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim();
      if (!runId && next) runId = next;
      return response;
    },
    getRunId: () => runId,
  };
}

export function createLovableResponsesProvider(lovableApiKey: string, initialRunId?: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
  return createOpenAI({
    baseURL: resolveAiBaseUrl("lovable"),
    apiKey: lovableApiKey,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch as typeof fetch,
  });
}

export function createLocalAiProvider() {
  const config = resolveAiRuntimeConfig();
  return createOpenAI({
    baseURL: config.provider === "ollama" ? config.baseUrl : AI_DEFAULTS.localBaseUrl,
    apiKey: config.apiKey ?? "ollama",
  });
}

/**
 * Builds the configured chat model. Provider, endpoint, model, timeout and
 * retry policy all come from server-side configuration (never from client
 * input). Throws a structured, secret-free error when the provider is not
 * configured (e.g. cloud mode without a key).
 */
export function createBusinessAiChatModel(model?: string) {
  const config = resolveAiRuntimeConfig();
  const selectedModel = model?.trim() || config.model;

  if (config.provider === "ollama") {
    return createOpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey ?? "ollama",
    }).chat(selectedModel);
  }

  if (config.provider === "openai-compatible") {
    if (!config.apiKey) {
      throw new AiProviderError("AI_PROVIDER=openai-compatible requires an API key (AI_API_KEY).");
    }
    return createOpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    }).chat(selectedModel);
  }

  // Lovable cloud gateway.
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new AiProviderError("LOVABLE_API_KEY missing for the cloud AI provider.");
  }
  return createLovableResponsesProvider(apiKey).chat(selectedModel);
}

/**
 * Retry policy for AI calls. Applied at call sites (generateText/streamText
 * `maxRetries`), since provider-level model settings do not carry it.
 */
export function getAiRetryPolicy(): { maxRetries: number; timeoutMs: number } {
  const config = resolveAiRuntimeConfig();
  return { maxRetries: config.maxRetries, timeoutMs: config.timeoutMs };
}

export interface AiProviderHealth {
  ok: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  latencyMs: number;
  errorCategory?: string;
  detail?: string;
}

/**
 * Lightweight provider health probe: GET {baseUrl}/models with a hard
 * timeout. Never exposes credentials; safe to call from admin diagnostics.
 */
export async function checkAiProviderHealth(): Promise<AiProviderHealth> {
  const config = resolveAiRuntimeConfig();
  const started = Date.now();
  const base: Omit<AiProviderHealth, "ok" | "latencyMs"> = {
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(config.timeoutMs, 10_000));
    const response = await fetch(`${config.baseUrl}/models`, {
      method: "GET",
      headers: config.apiKey && config.apiKey !== "ollama" ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      const category = categorizeAiError({ status: response.status });
      logAiEvent("provider_health", { provider: config.provider, model: config.model, outcome: "failure", errorCategory: category, latencyMs });
      return { ...base, ok: false, latencyMs, errorCategory: category, detail: `HTTP ${response.status}` };
    }
    logAiEvent("provider_health", { provider: config.provider, model: config.model, outcome: "success", latencyMs });
    return { ...base, ok: true, latencyMs };
  } catch (error) {
    const category = categorizeAiError(error);
    const latencyMs = Date.now() - started;
    logAiEvent("provider_health", { provider: config.provider, model: config.model, outcome: "failure", errorCategory: category, latencyMs });
    return { ...base, ok: false, latencyMs, errorCategory: category, detail: toSafeAiErrorMessage(category) };
  }
}

/** Secret-free config summary for diagnostics endpoints/logs. */
export function describeAiRuntime() {
  return describeAiConfig(resolveAiRuntimeConfig());
}
