import { createOpenAI } from "@ai-sdk/openai";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export type AiRuntimeMode = "cloud" | "local";

export function getAiRuntimeMode(): AiRuntimeMode {
  return process.env["AI_RUNTIME_MODE"] === "local" ? "local" : "cloud";
}

export function getAiRuntimeModel(fallback = "openai/gpt-4o-mini") {
  const configured = process.env["AI_MODEL"]?.trim();
  if (configured) return configured;
  if (getAiRuntimeMode() === "local") return process.env["AI_LOCAL_MODEL"]?.trim() || "qwen-1.5b";
  return fallback;
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
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: lovableApiKey,
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch as typeof fetch,
  });
}

export function createLocalAiProvider() {
  return createOpenAI({
    baseURL: process.env["AI_LOCAL_BASE_URL"]?.trim() || "http://127.0.0.1:11434/v1",
    apiKey: process.env["AI_LOCAL_API_KEY"]?.trim() || "ollama",
  });
}

export function createBusinessAiChatModel(model?: string) {
  const selectedModel = model?.trim() || getAiRuntimeModel();
  if (getAiRuntimeMode() === "local") {
    return createLocalAiProvider().chat(selectedModel);
  }

  const apiKey = process.env["LOVABLE_API_KEY"]?.trim();
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  return createLovableResponsesProvider(apiKey).chat(selectedModel);
}
