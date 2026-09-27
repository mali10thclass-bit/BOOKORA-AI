import { describe, expect, it } from "vitest";
import {
  AI_DEFAULTS,
  categorizeAiError,
  describeAiConfig,
  redactSecrets,
  resolveAiBaseUrl,
  resolveAiModel,
  resolveAiProvider,
  resolveAiRuntimeConfig,
  toSafeAiErrorMessage,
} from "./ai-runtime-config";

describe("resolveAiProvider", () => {
  it("defaults to lovable cloud", () => {
    expect(resolveAiProvider({})).toEqual({ provider: "lovable", source: "AI_RUNTIME_MODE" });
  });

  it("maps AI_RUNTIME_MODE=local to ollama (CPU-first)", () => {
    expect(resolveAiProvider({ AI_RUNTIME_MODE: "local" })).toEqual({
      provider: "ollama",
      source: "AI_RUNTIME_MODE",
    });
  });

  it("AI_PROVIDER overrides AI_RUNTIME_MODE", () => {
    expect(
      resolveAiProvider({ AI_RUNTIME_MODE: "local", AI_PROVIDER: "openai-compatible" }),
    ).toEqual({ provider: "openai-compatible", source: "AI_PROVIDER" });
  });

  it("ignores unknown AI_PROVIDER values", () => {
    expect(resolveAiProvider({ AI_PROVIDER: "gpu-cluster" }).provider).toBe("lovable");
  });
});

describe("resolveAiModel", () => {
  it("prefers explicit AI_MODEL", () => {
    expect(resolveAiModel("ollama", { AI_MODEL: "llama3.2:3b", AI_LOCAL_MODEL: "qwen-1.5b" })).toBe(
      "llama3.2:3b",
    );
  });

  it("uses CPU-first local default for ollama", () => {
    expect(resolveAiModel("ollama", {})).toBe(AI_DEFAULTS.localModel);
  });

  it("supports both LOCAL_AI_MODEL and legacy AI_LOCAL_MODEL", () => {
    expect(resolveAiModel("ollama", { LOCAL_AI_MODEL: "phi4-mini" })).toBe("phi4-mini");
    expect(resolveAiModel("ollama", { AI_LOCAL_MODEL: "qwen2.5:1.5b" })).toBe("qwen2.5:1.5b");
    expect(resolveAiModel("ollama", { LOCAL_AI_MODEL: "a", AI_LOCAL_MODEL: "b" })).toBe("a");
  });

  it("uses cloud default for lovable", () => {
    expect(resolveAiModel("lovable", {})).toBe(AI_DEFAULTS.cloudModel);
  });
});

describe("resolveAiBaseUrl", () => {
  it("defaults local endpoint to Ollama on localhost", () => {
    expect(resolveAiBaseUrl("ollama", {})).toBe("http://127.0.0.1:11434/v1");
  });

  it("prefers LOCAL_AI_BASE_URL and strips trailing slashes", () => {
    expect(
      resolveAiBaseUrl("ollama", {
        LOCAL_AI_BASE_URL: "http://localhost:11434/v1/",
        AI_LOCAL_BASE_URL: "http://legacy:11434/v1",
      }),
    ).toBe("http://localhost:11434/v1");
  });

  it("requires a valid AI_BASE_URL for openai-compatible", () => {
    expect(() => resolveAiBaseUrl("openai-compatible", {})).toThrow(/AI_BASE_URL/);
    expect(() => resolveAiBaseUrl("openai-compatible", { AI_BASE_URL: "not-a-url" })).toThrow();
    expect(resolveAiBaseUrl("openai-compatible", { AI_BASE_URL: "https://api.example.com/v1" })).toBe(
      "https://api.example.com/v1",
    );
  });

  it("defaults lovable to the gateway URL", () => {
    expect(resolveAiBaseUrl("lovable", {})).toBe(AI_DEFAULTS.lovableBaseUrl);
  });
});

describe("resolveAiRuntimeConfig", () => {
  it("clamps timeout and retries to safe bounds", () => {
    const config = resolveAiRuntimeConfig({
      AI_RUNTIME_MODE: "local",
      AI_TIMEOUT_MS: "50",
      AI_MAX_RETRIES: "99",
    });
    expect(config.timeoutMs).toBe(1000);
    expect(config.maxRetries).toBe(5);
  });

  it("uses a longer default timeout for local CPU inference", () => {
    const config = resolveAiRuntimeConfig({ AI_RUNTIME_MODE: "local" });
    expect(config.timeoutMs).toBe(AI_DEFAULTS.localTimeoutMs);
    expect(config.mode).toBe("local");
  });

  it("never returns secrets in describeAiConfig", () => {
    const config = resolveAiRuntimeConfig({ LOVABLE_API_KEY: "sk-super-secret-value-123" });
    const summary = JSON.stringify(describeAiConfig(config));
    expect(summary).not.toContain("super-secret");
    expect(summary).toContain('"apiKeyConfigured":true');
  });

  it("treats ollama as not requiring an API key", () => {
    const config = resolveAiRuntimeConfig({ AI_RUNTIME_MODE: "local" });
    expect(config.provider).toBe("ollama");
    expect(describeAiConfig(config).apiKeyConfigured).toBe(false);
  });
});

describe("categorizeAiError", () => {
  it("maps HTTP statuses to categories", () => {
    expect(categorizeAiError({ status: 401 })).toBe("auth");
    expect(categorizeAiError({ statusCode: 403 })).toBe("forbidden");
    expect(categorizeAiError({ status: 429 })).toBe("rate_limit");
    expect(categorizeAiError({ status: 500 })).toBe("unavailable");
    expect(categorizeAiError({ status: 400 })).toBe("invalid_request");
  });

  it("maps abort/timeout errors", () => {
    expect(categorizeAiError(new DOMException("aborted", "AbortError"))).toBe("timeout");
    expect(categorizeAiError(new Error("Request timed out after 30s"))).toBe("timeout");
  });

  it("maps network refusals to unavailable", () => {
    expect(categorizeAiError(new Error("fetch failed: ECONNREFUSED"))).toBe("unavailable");
  });

  it("returns controlled user messages without raw error text", () => {
    const message = toSafeAiErrorMessage("auth");
    expect(message).not.toMatch(/sk-|token|key/i);
    expect(toSafeAiErrorMessage("unknown").length).toBeGreaterThan(10);
  });
});

describe("redactSecrets", () => {
  it("redacts API-key-shaped strings and bearer tokens", () => {
    const redacted = redactSecrets(
      "Using key sk-abc123def456ghi789 and Bearer eyJhbGciOi.abc123 at sb_secret_qwertyuiop123",
    );
    expect(redacted).not.toContain("sk-abc123def456ghi789");
    expect(redacted).not.toContain("eyJhbGciOi.abc123");
    expect(redacted).not.toContain("sb_secret_qwertyuiop123");
    expect(redacted).toContain("[redacted]");
  });

  it("keeps ordinary text intact", () => {
    expect(redactSecrets("Booking created for Tuesday")).toBe("Booking created for Tuesday");
  });
});
