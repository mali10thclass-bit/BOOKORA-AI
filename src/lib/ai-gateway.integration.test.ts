/**
 * Provider-layer integration tests against a LOCAL OpenAI-compatible stub.
 *
 * Scope: exercises the REAL gateway + AI SDK code paths (createBusinessAiChatModel,
 * generateText, tool calling, timeouts, retries, error mapping) over real HTTP.
 *
 * IMPORTANT — this is a protocol-level stub, NOT a model runtime. It verifies
 * BOOKORA's provider plumbing only. Real-model verification (Ollama +
 * qwen-1.5b) is NOT covered here and is reported separately as NOT AVAILABLE
 * when no real endpoint is reachable.
 *
 * No GPU. No external network. Deterministic.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { z } from "zod";

type Scenario = {
  status: number;
  body: string;
  rawBody?: string;
  delayMs?: number;
  toolCall?: { name: string; arguments: Record<string, unknown> };
};

let server: Server;
let baseUrl: string;
let scenario: Scenario = { status: 200, body: "Hello from stub" };
let requestLog: string[] = [];
let failCountdown = 0;
// Bumped per test so delayed handlers from a previous test (timeout case)
// cannot mutate this test's failure budget or responses.
let scenarioEpoch = 0;

function chatCompletionBody(content: string, toolCall?: Scenario["toolCall"]): string {
  const message: Record<string, unknown> = toolCall
    ? {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: toolCall.name, arguments: JSON.stringify(toolCall.arguments) },
          },
        ],
      }
    : { role: "assistant", content };
  return JSON.stringify({
    id: "chatcmpl-stub",
    object: "chat.completion",
    created: 0,
    model: "stub-model",
    choices: [{ index: 0, message, finish_reason: toolCall ? "tool_calls" : "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });
}

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = req.url ?? "";
    const epoch = scenarioEpoch;
    requestLog.push(url);
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const respond = () => {
        // Ignore stale responses for aborted/superseded requests (e.g. the
        // timeout test's delayed handler firing during a later test).
        if (epoch !== scenarioEpoch || res.destroyed || res.writableEnded) return;
        if (failCountdown > 0 && url.endsWith("/chat/completions")) {
          failCountdown -= 1;
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: { message: "internal stub failure" } }));
          return;
        }
        if (url.endsWith("/models")) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ object: "list", data: [{ id: "stub-model", object: "model" }] }));
          return;
        }
        if (url.endsWith("/chat/completions")) {
          if (scenario.rawBody !== undefined) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(scenario.rawBody);
            return;
          }
          if (scenario.status !== 200) {
            res.writeHead(scenario.status, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { message: `stub error ${scenario.status}`, type: "stub_error" } }));
            return;
          }
          res.writeHead(200, { "content-type": "application/json" });
          res.end(chatCompletionBody(scenario.body, scenario.toolCall));
          return;
        }
        res.writeHead(404).end();
      };
      if (scenario.delayMs) setTimeout(respond, scenario.delayMs);
      else respond();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}/v1`;
});

beforeEach(() => {
  scenarioEpoch += 1;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function loadGateway() {
  process.env["AI_PROVIDER"] = "openai-compatible";
  process.env["AI_BASE_URL"] = baseUrl;
  process.env["AI_API_KEY"] = "stub-key";
  process.env["AI_TIMEOUT_MS"] = "1000";
  process.env["AI_MAX_RETRIES"] = "2";
  const config = await import("./ai-runtime-config");
  const gateway = await import("./ai-gateway.server");
  return { config, gateway };
}

describe("provider layer over OpenAI-compatible HTTP (protocol stub)", () => {
  it("health probe reaches the configured endpoint", async () => {
    const { gateway } = await loadGateway();
    const health = await gateway.checkAiProviderHealth();
    expect(health.ok).toBe(true);
    expect(health.provider).toBe("openai-compatible");
    expect(health.baseUrl).toBe(baseUrl);
  });

  it("chat request succeeds and returns model text", async () => {
    const { gateway } = await loadGateway();
    const { generateText } = await import("ai");
    scenario = { status: 200, body: "Bookings are up 12% this week." };
    const result = await generateText({ model: gateway.createBusinessAiChatModel("stub-model"), prompt: "hello" });
    expect(result.text).toContain("12%");
  });

  it("tool-call response round-trips: model calls a tool, server executes it, model finishes", async () => {
    const { gateway } = await loadGateway();
    const { generateText, tool, stepCountIs } = await import("ai");
    const executed: Array<Record<string, unknown>> = [];
    scenario = {
      status: 200,
      body: "done",
      toolCall: { name: "record_note", arguments: { text: "hello from model" } },
    };
    const result = await generateText({
      model: gateway.createBusinessAiChatModel("stub-model"),
      tools: {
        record_note: tool({
          description: "Record a note (test tool)",
          inputSchema: z.object({ text: z.string() }),
          execute: async (args: Record<string, unknown>) => {
            executed.push(args);
            scenario = { status: 200, body: "Tool result received." };
            return "recorded";
          },
        }),
      },
      stopWhen: stepCountIs(2),
      prompt: "record a note",
    });
    expect(executed.length).toBe(1);
    expect(executed[0]?.["text"]).toBe("hello from model");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("timeout aborts and is categorized", async () => {
    const { config, gateway } = await loadGateway();
    const { generateText } = await import("ai");
    scenario = { status: 200, body: "slow", delayMs: 1500 };
    const started = Date.now();
    let caught: unknown = null;
    try {
      await generateText({
        model: gateway.createBusinessAiChatModel("stub-model"),
        prompt: "hello",
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(1000),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeNull();
    expect(Date.now() - started).toBeLessThan(2500);
    const category = config.categorizeAiError(caught);
    expect(["timeout", "unavailable", "unknown"]).toContain(category);
  });

  it("provider error statuses map to controlled categories with safe messages", async () => {
    const { config, gateway } = await loadGateway();
    const { generateText } = await import("ai");
    for (const [status, expected] of [
      [401, "auth"],
      [429, "rate_limit"],
      [500, "unavailable"],
    ] as const) {
      scenario = { status, body: "" };
      let caught: unknown = null;
      try {
        await generateText({
          model: gateway.createBusinessAiChatModel("stub-model"),
          prompt: "hello",
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(2000),
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).not.toBeNull();
      const category = config.categorizeAiError(caught);
      expect(category, `status ${status}`).toBe(expected);
      const message = config.toSafeAiErrorMessage(category);
      expect(message).not.toMatch(/stub error|sk-|token/i);
    }
  });

  it("malformed model output surfaces as a controlled failure", async () => {
    const { config, gateway } = await loadGateway();
    const { generateText } = await import("ai");
    scenario = { status: 200, body: "", rawBody: "{ this is not valid json" };
    let caught: unknown = null;
    try {
      await generateText({
        model: gateway.createBusinessAiChatModel("stub-model"),
        prompt: "hello",
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(2000),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeNull();
    const category = config.categorizeAiError(caught);
    expect(["malformed_output", "unknown", "invalid_request"]).toContain(category);
    expect(config.toSafeAiErrorMessage(category)).not.toMatch(/<html|stack|at \w+\./i);
  });

  it("retry budget is bounded and honored (maxRetries=2 -> 3 attempts)", async () => {
    const { gateway } = await loadGateway();
    const { generateText } = await import("ai");
    failCountdown = 2;
    requestLog = [];
    scenario = { status: 200, body: "recovered after retries" };
    const result = await generateText({
      model: gateway.createBusinessAiChatModel("stub-model"),
      prompt: "hello",
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(8000),
    });
    expect(result.text).toContain("recovered");
    console.log("DBG-RETRY", JSON.stringify(requestLog), "failCountdown:", failCountdown, "text:", result.text);
    expect(requestLog.filter((u) => u.endsWith("/chat/completions")).length).toBe(3);

    failCountdown = 5;
    requestLog = [];
    let caught: unknown = null;
    try {
      await generateText({
        model: gateway.createBusinessAiChatModel("stub-model"),
        prompt: "hello",
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeNull();
    expect(requestLog.filter((u) => u.endsWith("/chat/completions")).length).toBe(1);
    failCountdown = 0;
    scenario = { status: 200, body: "ok" };
  }, 30_000);
});
