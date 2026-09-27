/**
 * BOOKORA AI — authenticated server functions for controlled tool execution
 * and human handoff. All authorization is resolved server-side; the browser
 * can never supply its own business_id or role.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  resolveAgentToolContext,
  runAgentToolCore,
  type AgentToolResult,
} from "./executor-core.server";
import { getAgentTool } from "./registry";
import { createAiRequestId, logAiEvent } from "../ai-observability.server";

const ExecuteToolInput = z
  .object({
    toolName: z.string().min(1).max(60),
    input: z.record(z.unknown()).default({}),
    mode: z.enum(["auto", "propose", "commit"]).default("auto"),
    proposalId: z.string().uuid().nullable().optional(),
    agentId: z.string().uuid().nullable().optional(),
    conversationId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const executeAgentTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExecuteToolInput.parse(input))
  .handler(async ({ data, context }): Promise<{ result: AgentToolResult | null; error: string | null }> => {
    const requestId = createAiRequestId();
    const started = Date.now();
    const ctx = await resolveAgentToolContext(context.supabase, context.userId);
    if (!ctx) {
      logAiEvent("tool_executed", { requestId, outcome: "denied", toolName: data.toolName, latencyMs: Date.now() - started });
      return { result: null, error: "No business found for your account." };
    }

    const tool = getAgentTool(data.toolName);
    if (!tool || !tool.dashboardAllowed) {
      logAiEvent("tool_executed", { requestId, outcome: "denied", toolName: data.toolName, latencyMs: Date.now() - started });
      return { result: null, error: "Unknown or unavailable tool." };
    }

    const result = await runAgentToolCore({
      toolName: data.toolName,
      input: data.input,
      mode: data.mode,
      proposalId: data.proposalId ?? null,
      ctx: {
        ...ctx,
        agentId: data.agentId ?? null,
        conversationId: data.conversationId ?? null,
      },
      supabase: context.supabase,
    });

    logAiEvent("tool_executed", {
      requestId,
      businessId: ctx.businessId,
      agentId: data.agentId ?? null,
      toolName: data.toolName,
      outcome: result.status,
      latencyMs: Date.now() - started,
    });

    return { result, error: null };
  });

const HandoffInput = z
  .object({
    reason: z.string().min(3).max(500),
    summary: z.string().max(2000).optional(),
    agentId: z.string().uuid().nullable().optional(),
    conversationId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const requestHumanHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HandoffInput.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = await resolveAgentToolContext(context.supabase, context.userId);
    if (!ctx) return { handoff: null, error: "No business found for your account." };

    const result = await runAgentToolCore({
      toolName: "request_human_handoff",
      input: { reason: data.reason, summary: data.summary },
      mode: "auto",
      ctx: { ...ctx, agentId: data.agentId ?? null, conversationId: data.conversationId ?? null },
      supabase: context.supabase,
    });

    if (result.status !== "completed") {
      return {
        handoff: null,
        error: result.status === "failed" || result.status === "denied" ? result.error : "Handoff could not be opened.",
      };
    }

    return {
      handoff: {
        id: (result.output as { handoff_id?: string }).handoff_id ?? null,
        status: "pending" as const,
        message:
          (result.output as { message?: string }).message ??
          "A human team member has been notified and will continue this conversation.",
      },
      error: null,
    };
  });
