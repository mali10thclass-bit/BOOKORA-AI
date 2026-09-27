/**
 * BOOKORA AI — provider/runtime configuration model.
 *
 * Pure, dependency-free module so it can be unit-tested without a server.
 * The server-side provider factory (ai-gateway.server.ts) consumes this.
 *
 * Provider selection order:
 *   1. AI_PROVIDER = "lovable" | "ollama" | "openai-compatible"  (explicit)
 *   2. AI_RUNTIME_MODE = "local"  -> ollama, otherwise lovable (cloud)
 *
 * Model selection order:
 *   1. AI_MODEL
 *   2. provider default variable (AI_LOCAL_MODEL / LOCAL_AI_MODEL for ollama,
 *      AI_MODEL for others)
 *   3. built-in default (never a GPU-dependent model)
 *
 * Endpoint selection order:
 *   lovable            -> AI_BASE_URL or https://ai.gateway.lovable.dev/v1
 *   ollama             -> LOCAL_AI_BASE_URL or AI_LOCAL_BASE_URL or
 *                         http://127.0.0.1:11434/v1
 *   openai-compatible  -> AI_BASE_URL (required)
 */

export type AiProviderId = "lovable" | "ollama" | "openai-compatible";
export type AiRuntimeMode = "cloud" | "local";

export interface AiEnvLike {
  [key: string]: string | undefined;
}

export interface AiRuntimeConfig {
  provider: AiProviderId;
  mode: AiRuntimeMode;
  model: string;
  baseUrl: string;
  /** Server-only credential. Never log or return this to clients. */
  apiKey: string | null;
  timeoutMs: number;
  maxRetries: number;
  /** Which env var selected the provider — safe to log. */
  providerSource: "AI_PROVIDER" | "AI_RUNTIME_MODE";
}

export const AI_DEFAULTS = {
  cloudModel: "openai/gpt-4o-mini",
  localModel: "qwen-1.5b",
  localBaseUrl: "http://127.0.0.1:11434/v1",
  lovableBaseUrl: "https://ai.gateway.lovable.dev/v1",
  timeoutMs: 30_000,
  localTimeoutMs: 60_000,
  maxRetries: 2,
} as const;

export type AiErrorCategory =
  | "auth"
  | "forbidden"
  | "rate_limit"
  | "timeout"
  | "unavailable"
  | "malformed_output"
  | "invalid_request"
  | "unknown";

const SECRET_PATTERN =
  /\b(?:sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|sb_secret_[A-Za-z0-9_-]{8,}|sb_publishable_[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{16,}|gho_[A-Za-z0-9]{16,}|ghu_[A-Za-z0-9]{16,}|ghs_[A-Za-z0-9]{16,}|ghr_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|glpat-[A-Za-z0-9_-]{16,}|npm_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._~+/-]{12,}|LOVABLE_API_KEY\s*[:=]\s*\S+|api[_-]?key["'\s:=]+\S{8,})/gi;

/** Redacts anything that looks like a credential before text is logged or returned. */
export function redactSecrets(text: string): string {
  return text.replace(SECRET_PATTERN, "[redacted]");
}

function trimmed(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function parseBoundedInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveAiProvider(
  env: AiEnvLike = process.env as AiEnvLike,
): { provider: AiProviderId; source: AiRuntimeConfig["providerSource"] } {
  const explicit = trimmed(env["AI_PROVIDER"])?.toLowerCase();
  if (explicit === "lovable" || explicit === "ollama" || explicit === "openai-compatible") {
    return { provider: explicit, source: "AI_PROVIDER" };
  }
  const mode = trimmed(env["AI_RUNTIME_MODE"])?.toLowerCase();
  return {
    provider: mode === "local" ? "ollama" : "lovable",
    source: "AI_RUNTIME_MODE",
  };
}

export function resolveAiModel(
  provider: AiProviderId,
  env: AiEnvLike = process.env as AiEnvLike,
  fallback?: string,
): string {
  const configured = trimmed(env["AI_MODEL"]);
  if (configured) return configured;
  if (fallback?.trim()) return fallback.trim();
  if (provider === "ollama") {
    return (
      trimmed(env["LOCAL_AI_MODEL"]) ??
      trimmed(env["AI_LOCAL_MODEL"]) ??
      AI_DEFAULTS.localModel
    );
  }
  return AI_DEFAULTS.cloudModel;
}

export function resolveAiBaseUrl(
  provider: AiProviderId,
  env: AiEnvLike = process.env as AiEnvLike,
): string {
  if (provider === "ollama") {
    return normalizeBaseUrl(
      trimmed(env["LOCAL_AI_BASE_URL"]) ??
        trimmed(env["AI_LOCAL_BASE_URL"]) ??
        AI_DEFAULTS.localBaseUrl,
    );
  }
  if (provider === "openai-compatible") {
    const url = trimmed(env["AI_BASE_URL"]);
    if (!url || !isHttpUrl(url)) {
      throw new Error("AI_PROVIDER=openai-compatible requires a valid AI_BASE_URL (http/https).");
    }
    return normalizeBaseUrl(url);
  }
  return normalizeBaseUrl(trimmed(env["AI_BASE_URL"]) ?? AI_DEFAULTS.lovableBaseUrl);
}

export function resolveAiApiKey(
  provider: AiProviderId,
  env: AiEnvLike = process.env as AiEnvLike,
): string | null {
  if (provider === "ollama") {
    // Ollama does not require a key; some OpenAI-compatible local servers do.
    return trimmed(env["AI_LOCAL_API_KEY"]) ?? trimmed(env["LOCAL_AI_API_KEY"]) ?? "ollama";
  }
  if (provider === "openai-compatible") {
    return (
      trimmed(env["AI_API_KEY"]) ??
      trimmed(env["OPENAI_API_KEY"]) ??
      trimmed(env["AI_LOCAL_API_KEY"]) ??
      null
    );
  }
  return trimmed(env["LOVABLE_API_KEY"]) ?? null;
}

/**
 * Builds the full runtime configuration. Throws plain, secret-free errors for
 * invalid configuration only (never for a missing key — missing keys are
 * reported so callers can fail gracefully).
 */
export function resolveAiRuntimeConfig(
  env: AiEnvLike = process.env as AiEnvLike,
): AiRuntimeConfig {
  const { provider, source } = resolveAiProvider(env);
  const isLocal = provider === "ollama";
  return {
    provider,
    mode: isLocal ? "local" : "cloud",
    model: resolveAiModel(provider, env),
    baseUrl: resolveAiBaseUrl(provider, env),
    apiKey: resolveAiApiKey(provider, env),
    timeoutMs: parseBoundedInt(
      trimmed(env["AI_TIMEOUT_MS"]),
      isLocal ? AI_DEFAULTS.localTimeoutMs : AI_DEFAULTS.timeoutMs,
      1_000,
      300_000,
    ),
    maxRetries: parseBoundedInt(trimmed(env["AI_MAX_RETRIES"]), AI_DEFAULTS.maxRetries, 0, 5),
    providerSource: source,
  };
}

export interface AiConfigSummary {
  provider: string;
  mode: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  providerSource: string;
  apiKeyConfigured: boolean;
}

/** Human-readable, secret-free summary safe for logs. */
export function describeAiConfig(config: AiRuntimeConfig): AiConfigSummary {
  return {
    provider: config.provider,
    mode: config.mode,
    model: config.model,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    providerSource: config.providerSource,
    apiKeyConfigured: Boolean(config.apiKey && config.apiKey !== "ollama"),
  };
}

interface ErrorLike {
  message?: unknown;
  statusCode?: unknown;
  status?: unknown;
  name?: unknown;
  cause?: unknown;
}

/**
 * Maps arbitrary failures onto stable categories used for logging and for
 * producing controlled user-facing messages. Never returns raw error text.
 */
export function categorizeAiError(error: unknown): AiErrorCategory {
  const err = (error ?? {}) as ErrorLike;
  const status =
    typeof err.statusCode === "number"
      ? err.statusCode
      : typeof err.status === "number"
        ? err.status
        : typeof (err.cause as ErrorLike | undefined)?.statusCode === "number"
          ? ((err.cause as ErrorLike).statusCode as number)
          : undefined;

  const message = String(err.message ?? "").toLowerCase();
  const name = String(err.name ?? "").toLowerCase();

  if (name.includes("abort") || message.includes("timed out") || message.includes("timeout")) {
    return "timeout";
  }
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limit";
  if (status === 402) return "rate_limit";
  if (status === 400 || status === 422) return "invalid_request";
  if (status === 404 || status === 410) return "unavailable";
  if (status !== undefined && status >= 500) return "unavailable";
  if (
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("socket")
  ) {
    return "unavailable";
  }
  if (message.includes("json") || message.includes("malformed") || message.includes("parse")) {
    return "malformed_output";
  }
  return "unknown";
}

const USER_MESSAGES: Record<AiErrorCategory, string> = {
  auth: "The AI provider rejected the configured credentials. A business owner should check the server AI configuration.",
  forbidden: "The AI provider refused the request. Nothing was changed.",
  rate_limit: "The assistant is rate limited right now. Try again in a moment.",
  timeout: "The assistant took too long to answer. Try again in a moment.",
  unavailable: "The AI provider is unavailable right now. Try again shortly.",
  malformed_output: "The assistant produced an unreadable answer. Try rephrasing your question.",
  invalid_request: "The assistant could not process that request.",
  unknown: "The assistant could not answer right now.",
};

/** Controlled, secret-free, user-facing failure message. */
export function toSafeAiErrorMessage(category: AiErrorCategory): string {
  return USER_MESSAGES[category];
}
