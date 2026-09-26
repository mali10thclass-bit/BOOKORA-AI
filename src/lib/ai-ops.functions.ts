/**
 * BOOKORA AI — analytics and diagnostics server functions.
 *
 * All metrics are derived from rows actually stored by the application
 * (conversations, messages, tool audits, handoffs, evaluations). No KPIs are
 * invented or estimated.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAgentToolContext } from "./agent-tools/executor-core.server";
import { checkAiProviderHealth, describeAiRuntime } from "./ai-gateway.server";

export interface AiAgentAnalytics {
  conversations: {
    total: number;
    active: number;
    messages: number;
    aiMessages: number;
    humanMessages: number;
  };
  handoffs: {
    total: number;
    pending: number;
    accepted: number;
    resolved: number;
    cancelled: number;
  };
  toolRuns: {
    total: number;
    completed: number;
    failed: number;
    proposed: number;
    denied: number;
  };
  actionRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    executed: number;
    failed: number;
  };
  evaluations: {
    recorded: number;
    grounded: number;
    evalRuns: number;
    lastRunScore: number | null;
    lastRunPassed: number | null;
    lastRunCases: number | null;
  };
  knowledgeSources: {
    total: number;
  };
  generatedAt: string;
}

export const getAiAgentAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ analytics: AiAgentAnalytics | null; error: string | null }> => {
    const ctx = await resolveAgentToolContext(context.supabase, context.userId);
    if (!ctx) return { analytics: null, error: "No business found for your account." };

    const businessId = ctx.businessId;
    const supabase = context.supabase;

    const [conversations, messages, handoffs, toolRuns, actionRequests, evaluations, evalRuns, knowledge] =
      await Promise.all([
        supabase.from("ai_conversations").select("id,status", { count: "exact", head: false }).eq("business_id", businessId),
        supabase.from("ai_messages").select("id,role", { count: "exact", head: false }).eq("business_id", businessId).limit(10000),
        supabase.from("ai_agent_handoffs").select("status", { count: "exact", head: false }).eq("business_id", businessId),
        supabase
          .from("enterprise_audit_logs")
          .select("action", { count: "exact", head: false })
          .eq("business_id", businessId)
          .like("action", "ai_tool_%")
          .limit(5000),
        supabase.from("ai_action_requests").select("status", { count: "exact", head: false }).eq("business_id", businessId),
        supabase
          .from("ai_agent_evaluations")
          .select("grounded", { count: "exact", head: false })
          .eq("business_id", businessId)
          .limit(5000),
        supabase
          .from("ai_agent_eval_runs")
          .select("score,passed_count,case_count,created_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("ai_knowledge_sources").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      ]);

    const firstError =
      conversations.error ??
      messages.error ??
      handoffs.error ??
      toolRuns.error ??
      actionRequests.error ??
      evaluations.error ??
      evalRuns.error ??
      knowledge.error;
    if (firstError) {
      return { analytics: null, error: "Could not load AI analytics right now." };
    }

    const countBy = <T extends string>(rows: { status?: T | null }[] | null, key: T): number =>
      (rows ?? []).filter((row) => row.status === key).length;

    const messageRows = (messages.data ?? []) as { role: string }[];
    const handoffRows = (handoffs.data ?? []) as { status: string }[];
    const toolRows = (toolRuns.data ?? []) as { action: string }[];
    const actionRows = (actionRequests.data ?? []) as { status: string }[];
    const evalRows = (evaluations.data ?? []) as { grounded: boolean }[];
    const lastRun = (evalRuns.data ?? [])[0] as
      | { score: number | null; passed_count: number | null; case_count: number | null }
      | undefined;

    return {
      analytics: {
        conversations: {
          total: conversations.count ?? conversations.data?.length ?? 0,
          active: countBy(conversations.data as { status: string }[] | null, "active"),
          messages: messages.count ?? messageRows.length,
          aiMessages: messageRows.filter((m) => m.role === "assistant").length,
          humanMessages: messageRows.filter((m) => m.role === "user").length,
        },
        handoffs: {
          total: handoffs.count ?? handoffRows.length,
          pending: countBy(handoffRows, "pending"),
          accepted: countBy(handoffRows, "accepted"),
          resolved: countBy(handoffRows, "resolved"),
          cancelled: countBy(handoffRows, "cancelled"),
        },
        toolRuns: {
          total: toolRuns.count ?? toolRows.length,
          completed: toolRows.filter((r) => r.action === "ai_tool_completed").length,
          failed: toolRows.filter((r) => r.action === "ai_tool_failed").length,
          proposed: toolRows.filter((r) => r.action === "ai_tool_proposed").length,
          denied: toolRows.filter((r) => r.action === "ai_tool_denied").length,
        },
        actionRequests: {
          total: actionRequests.count ?? actionRows.length,
          pending: countBy(actionRows, "pending"),
          approved: countBy(actionRows, "approved"),
          rejected: countBy(actionRows, "rejected"),
          executed: countBy(actionRows, "executed"),
          failed: countBy(actionRows, "failed"),
        },
        evaluations: {
          recorded: evaluations.count ?? evalRows.length,
          grounded: evalRows.filter((e) => e.grounded).length,
          evalRuns: evalRuns.data?.length ? 1 : 0,
          lastRunScore: lastRun?.score ?? null,
          lastRunPassed: lastRun?.passed_count ?? null,
          lastRunCases: lastRun?.case_count ?? null,
        },
        knowledgeSources: {
          total: knowledge.count ?? 0,
        },
        generatedAt: new Date().toISOString(),
      },
      error: null,
    };
  });

/**
 * Provider diagnostics for the admin area: secret-free runtime description
 * plus a live health probe against the configured endpoint.
 */
export const getAiProviderDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await resolveAgentToolContext(context.supabase, context.userId);
    if (!ctx) return { diagnostics: null, error: "No business found for your account." };

    const runtime = describeAiRuntime();
    const health = await checkAiProviderHealth();
    return {
      diagnostics: {
        runtime: { ...runtime },
        health: {
          ok: health.ok,
          provider: health.provider,
          baseUrl: health.baseUrl,
          model: health.model,
          latencyMs: health.latencyMs,
          errorCategory: health.errorCategory ?? null,
          detail: health.detail ?? null,
        },
      },
      error: null,
    };
  });
