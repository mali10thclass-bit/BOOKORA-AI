import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { streamText } from "ai";
import type { ToolSet } from "ai";
import { z } from "zod";

const AskInput = z.object({
  question: z.string().min(1).max(2000),
  language: z.enum(["en", "ur", "ar", "es", "fr"]).default("en"),
  conversationId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
});

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ur: "Urdu",
  ar: "Arabic",
  es: "Spanish",
  fr: "French",
};

export const askBusinessAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    // Resolve the caller's own business only — never accept one from the browser.
    const { data: member } = await supabase
      .from("business_members")
      .select("business_id, role, businesses(name, currency, timezone, plan)")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!member?.business_id) {
      return { answer: null, error: "No business found for your account.", toolActivity: [], pendingAction: null };
    }

    const business = (
      member as unknown as {
        businesses: {
          name: string;
          currency: string | null;
          timezone: string | null;
          plan: string | null;
        } | null;
      }
    ).businesses;

    if (!business || !["pro", "ultimate", "enterprise"].includes(business.plan ?? "free")) {
      return {
        answer: null,
        error: "AI Assistant is available on Pro, Ultimate and Enterprise plans. Upgrade through billing to continue.",
        toolActivity: [],
        pendingAction: null,
      };
    }

    const runtimeConfig = await import("./ai-runtime-config").then((m) => {
      try {
        return m.resolveAiRuntimeConfig();
      } catch {
        return null;
      }
    });
    if (!runtimeConfig) {
      return { answer: null, error: "AI is not configured correctly for this project.", toolActivity: [], pendingAction: null };
    }
    const needsApiKey = runtimeConfig.provider !== "ollama";
    if (needsApiKey && !runtimeConfig.apiKey) {
      return { answer: null, error: "AI is not configured for this project yet.", toolActivity: [], pendingAction: null };
    }

    const businessId = member.business_id;

    const [memoryRes, historyRes] = data.conversationId
      ? await Promise.all([
          supabase.from("ai_agent_memories").select("memory_type,content,confidence").eq("business_id", businessId).eq("agent_id", data.agentId ?? "").order("created_at", { ascending: false }).limit(40),
          supabase.from("ai_messages").select("role,content").eq("business_id", businessId).eq("conversation_id", data.conversationId).order("created_at", { ascending: false }).limit(20),
        ])
      : [{ data: [] as { memory_type: string; content: string; confidence: number | null }[], error: null }, { data: [] as { role: string; content: string }[], error: null }];

    const [snapshotRes, knowledgeRes, agentRes, runtimeModelRes] = await Promise.all([
      supabase.rpc("ai_business_snapshot", { p_business_id: businessId, p_question: data.question }),
      supabase.rpc("search_ai_knowledge_text", {
        p_business_id: businessId,
        p_query: data.question,
        p_match_count: 8,
      }),
      data.agentId
        ? supabase
            .from("ai_agents")
            .select("name,role,system_prompt,model,capabilities,config,status")
            .eq("business_id", businessId)
            .eq("id", data.agentId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      data.agentId
        ? supabase.rpc("ai_runtime_model", { p_business_id: businessId, p_agent_id: data.agentId })
        : Promise.resolve({ data: null, error: null }),
    ]);

    const queryError = memoryRes.error ?? historyRes.error ?? snapshotRes.error ?? knowledgeRes.error ?? agentRes.error ?? runtimeModelRes.error;
    if (queryError) {
      console.error("[assistant] data query failed", queryError.message);
      return { answer: null, error: "I could not read your business data just now.", toolActivity: [], pendingAction: null };
    }

    const knowledge = (knowledgeRes.data ?? []).map((item) => ({
      sourceId: item.source_id,
      content: item.content,
      rank: Number(item.rank ?? 0),
      metadata: item.metadata,
    }));

    const snapshot = {
      ...((snapshotRes.data ?? {}) as Record<string, unknown>),
      agentMemory: (memoryRes.data ?? [])
        .map((m) => ({ type: m.memory_type, content: m.content, confidence: m.confidence }))
        .slice(0, 40),
      recentConversation: [...(historyRes.data ?? [])].reverse().slice(-20),
      retrievedKnowledge: knowledge,
      activeAgent: agentRes.data
        ? {
            name: agentRes.data.name,
            role: agentRes.data.role,
            systemPrompt: agentRes.data.system_prompt,
            capabilities: agentRes.data.capabilities,
            config: agentRes.data.config,
          }
        : null,
    };

    const { createBusinessAiChatModel, getAiRuntimeMode, getAiRuntimeModel, getAiRetryPolicy } = await import("./ai-gateway.server");
    const { buildInjectionHardenedSystemPrompt, wrapUntrusted } = await import("./agent-tools/guardrails");
    const { runAgentToolCore, toolResultToUntrustedText, resolveAgentToolContext } = await import("./agent-tools/executor-core.server");
    const { listAgentTools } = await import("./agent-tools/registry");
    const { categorizeAiError, toSafeAiErrorMessage } = await import("./ai-runtime-config");
    const { generateText, stepCountIs, tool } = await import("ai");
    const runtimeMode = getAiRuntimeMode();
    const runtimeModel = typeof runtimeModelRes.data === "string" ? runtimeModelRes.data : getAiRuntimeModel();
    const retryPolicy = getAiRetryPolicy();
    const language = LANGUAGE_NAMES[data.language] ?? "English";

    // Full business context for controlled tool execution (server-resolved).
    const toolCtx = await resolveAgentToolContext(supabase, context.userId);

    const toolActivity: Array<{ toolName: string; status: string; summary: string }> = [];
    // Holder object so control-flow analysis doesn't narrow across closures.
    const pendingActionRef: {
      current: { proposalId: string; toolName: string; summary: string } | null;
    } = { current: null };

    const toolsForModel: ToolSet = {};
    if (toolCtx) {
      for (const def of listAgentTools({ channel: "dashboard" })) {
        toolsForModel[def.name] = tool({
          description: def.description,
          inputSchema: def.inputSchema,
          execute: async (args: Record<string, unknown>) => {
            const toolResult = await runAgentToolCore({
              toolName: def.name,
              input: args,
              mode: "auto",
              ctx: {
                ...toolCtx,
                agentId: data.agentId ?? null,
                conversationId: data.conversationId ?? null,
              },
              supabase,
            });
            toolActivity.push({
              toolName: def.name,
              status: toolResult.status,
              summary: toolResult.summary,
            });
            if (toolResult.status === "confirmation_required" && !pendingActionRef.current) {
              pendingActionRef.current = {
                proposalId: toolResult.proposalId,
                toolName: toolResult.toolName,
                summary: toolResult.summary,
              };
            }
            // Tool output is untrusted DATA - wrapped and sanitized for the model.
            return toolResultToUntrustedText(toolResult);
          },
        });
      }
    }

    const systemPrompt = buildInjectionHardenedSystemPrompt({
      languageName: language,
      agentName: snapshot.activeAgent ? (snapshot.activeAgent as { name?: string }).name : null,
      agentInstructions: snapshot.activeAgent
        ? [
            (snapshot.activeAgent as { systemPrompt?: string }).systemPrompt ?? "",
            JSON.stringify((snapshot.activeAgent as { config?: unknown }).config ?? {}),
          ].join("\n")
        : null,
      tone: null,
      toolNames: Object.keys(toolsForModel),
      allowActions: true,
    });

    try {
      const result = await generateText({
        model: createBusinessAiChatModel(runtimeModel),
        tools: toolsForModel,
        stopWhen: stepCountIs(4),
        maxRetries: retryPolicy.maxRetries,
        abortSignal: AbortSignal.timeout(retryPolicy.timeoutMs),
        providerOptions:
          runtimeMode === "cloud"
            ? {
                openai: {
                  forceReasoning: true,
                  reasoningEffort: "low",
                  reasoningSummary: "auto",
                  store: false,
                },
              }
            : undefined,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              wrapUntrusted("business_snapshot_json", JSON.stringify(snapshot)),
              wrapUntrusted("user_question", data.question),
            ].join("\n\n"),
          },
        ],
      });

      const answer = result.text.trim();
      return {
        answer: answer || "I could not produce an answer for that question.",
        error: null,
        toolActivity,
        pendingAction: pendingActionRef.current,
      };
    } catch (error) {
      const category = categorizeAiError(error);
      const status =
        (error as { statusCode?: number; status?: number }).statusCode ??
        (error as { status?: number }).status;
      if (status === 402) {
        return {
          answer: null,
          error: "The workspace is out of AI credits. Add credits to keep using the assistant.",
          toolActivity,
          pendingAction: pendingActionRef.current,
        };
      }
      if (status === 429) {
        return {
          answer: null,
          error: "The assistant is rate limited right now. Try again in a moment.",
          toolActivity,
          pendingAction: pendingActionRef.current,
        };
      }
      console.error("[assistant]", category);
      return { answer: null, error: toSafeAiErrorMessage(category), toolActivity, pendingAction: pendingActionRef.current };
    }
  });




export const runAgentEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ agentId: z.string().uuid(), runId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: member } = await supabase
      .from("business_members")
      .select("business_id, businesses(name, currency, timezone, plan)")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member?.business_id) return { error: "No business found for your account." };

    const businessId = member.business_id;
    const business = (member as unknown as { businesses: { name:string; currency:string|null; timezone:string|null; plan:string|null } | null }).businesses;
    if (!business || !["pro","ultimate","enterprise"].includes(business.plan ?? "free")) {
      return { error: "Agent evaluation requires a Pro, Ultimate or Enterprise plan." };
    }
    const runtimeConfig = await import("./ai-runtime-config").then((m) => {
      try {
        return m.resolveAiRuntimeConfig();
      } catch {
        return null;
      }
    });
    if (!runtimeConfig) return { error: "AI is not configured correctly for this project." };
    if (runtimeConfig.provider !== "ollama" && !runtimeConfig.apiKey) {
      return { error: "AI is not configured for this project yet." };
    }

    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id,name,system_prompt,model,capabilities,config")
      .eq("business_id", businessId)
      .eq("id", data.agentId)
      .maybeSingle();
    if (!agent) return { error: "Agent not found." };

    const { data: cases, error: caseError } = await supabase
      .from("ai_agent_eval_cases")
      .select("id,input,expected_criteria")
      .eq("business_id", businessId)
      .eq("agent_id", data.agentId)
      .eq("enabled", true)
      .order("created_at", { ascending: true });
    if (caseError) return { error: "Could not load evaluation cases." };

    await supabase.from("ai_agent_eval_runs").update({ status:"running" }).eq("id", data.runId).eq("business_id", businessId);

    const { createBusinessAiChatModel, getAiRetryPolicy } = await import("./ai-gateway.server");
    const retry = getAiRetryPolicy();
    const results: Array<{caseId:string; input:string; output:string; passed:boolean; score:number; feedback:string}> = [];

    for (const testCase of cases ?? []) {
      try {
        const result = streamText({
          model: createBusinessAiChatModel(agent.model || undefined),
          maxRetries: retry.maxRetries,
          abortSignal: AbortSignal.timeout(retry.timeoutMs),
          providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false } },
          system: [
            "You are being evaluated as a BOOKORA AI business agent.",
            "Use only the supplied business context and agent instructions. Do not invent business facts.",
            agent.system_prompt ?? "",
          ].join("\n"),
          messages: [{ role:"user", content: `Business: ${business.name}\nQuestion: ${testCase.input}` }],
        });
        const output = (await result.text).trim();
        const { scoreEvalOutput } = await import("./agent-tools/eval-scoring");
        const scored = scoreEvalOutput(output, testCase.expected_criteria);
        results.push({caseId:testCase.id,input:testCase.input,output,passed:scored.passed,score:scored.score,feedback:scored.feedback});
      } catch (error) {
        results.push({caseId:testCase.id,input:testCase.input,output:"",passed:false,score:0,feedback:error instanceof Error?error.message:String(error)});
      }
    }

    for (const r of results) {
      await supabase.from("ai_agent_eval_results").insert({
        run_id:data.runId,business_id:businessId,agent_id:data.agentId,case_id:r.caseId,
        input:r.input,output:r.output,passed:r.passed,score:r.score,feedback:r.feedback,
      });
    }
    const score = results.length ? results.reduce((s,r)=>s+r.score,0)/results.length : 0;
    const passed = results.filter(r=>r.passed).length;
    await supabase.from("ai_agent_eval_runs").update({
      status:"completed",case_count:results.length,passed_count:passed,score,
      summary:`Evaluated ${results.length} cases; ${passed} fully passed; deterministic score ${score.toFixed(4)}.`,
      completed_at:new Date().toISOString(),
    }).eq("id",data.runId).eq("business_id",businessId);

    return { runId:data.runId, caseCount:results.length, passedCount:passed, score };
  });
