import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { streamText } from "ai";
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
      return { answer: null, error: "No business found for your account." };
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
      };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { answer: null, error: "AI is not configured for this project yet." };
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
      return { answer: null, error: "I could not read your business data just now." };
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

    const { createLovableResponsesProvider } = await import("./ai-gateway.server");
    const lovable = createLovableResponsesProvider(apiKey);
    const runtimeModel = typeof runtimeModelRes.data === "string" ? runtimeModelRes.data : "openai/gpt-6-astra";
    const language = LANGUAGE_NAMES[data.language] ?? "English";

    try {
      const result = streamText({
        model: lovable.responses(runtimeModel),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
          },
        },
        system: [
          "You are the business analytics assistant inside BOOKORA AI, an appointment booking app.",
          "Answer strictly from the JSON business snapshot, retrieved business knowledge, approved agent memory, active agent instructions, and recent conversation given in the user message.",
          "Never invent numbers, policies, availability, customer details, or actions. If evidence is missing or conflicting, say so plainly. Never claim an action was completed unless a verified tool result says it was completed.",
          "Be concise: short paragraphs or small bullet lists, with concrete numbers and the business currency.",
          `Reply only in ${language}.`,
        ].join(" "),
        messages: [
          {
            role: "user",
            content: `Business data snapshot (JSON):
${JSON.stringify(snapshot)}

Question: ${data.question}`,
          },
        ],
      });

      const answer = (await result.text).trim();
      return { answer: answer || "I could not produce an answer for that question.", error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status =
        (error as { statusCode?: number; status?: number }).statusCode ??
        (error as { status?: number }).status;
      if (status === 402) {
        return {
          answer: null,
          error: "The workspace is out of AI credits. Add credits to keep using the assistant.",
        };
      }
      if (status === 429) {
        return {
          answer: null,
          error: "The assistant is rate limited right now. Try again in a moment.",
        };
      }
      console.error("[assistant]", message);
      return { answer: null, error: "The assistant could not answer right now." };
    }
  });


const EvalCriteria = z.object({
  contains_any: z.array(z.string()).optional(),
  contains_all: z.array(z.string()).optional(),
  exact: z.string().optional(),
  regex: z.string().optional(),
  max_length: z.number().int().positive().optional(),
  must_not_contain: z.array(z.string()).optional(),
}).passthrough();

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
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "AI is not configured for this project yet." };

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

    const { createLovableResponsesProvider } = await import("./ai-gateway.server");
    const lovable = createLovableResponsesProvider(apiKey);
    const results: Array<{caseId:string; input:string; output:string; passed:boolean; score:number; feedback:string}> = [];

    for (const testCase of cases ?? []) {
      try {
        const result = streamText({
          model: lovable.responses(agent.model || "openai/gpt-4o-mini"),
          providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false } },
          system: [
            "You are being evaluated as a BOOKORA AI business agent.",
            "Use only the supplied business context and agent instructions. Do not invent business facts.",
            agent.system_prompt ?? "",
          ].join("\n"),
          messages: [{ role:"user", content: `Business: ${business.name}\nQuestion: ${testCase.input}` }],
        });
        const output = (await result.text).trim();
        const criteria = EvalCriteria.safeParse(testCase.expected_criteria);
        let checks = 0;
        let passedChecks = 0;
        const feedback: string[] = [];
        if (criteria.success) {
          const c = criteria.data;
          if (c.exact !== undefined) { checks++; if (output.trim() === c.exact.trim()) passedChecks++; else feedback.push("exact mismatch"); }
          if (c.contains_any?.length) { checks++; if (c.contains_any.some(x=>output.toLowerCase().includes(x.toLowerCase()))) passedChecks++; else feedback.push("none of contains_any matched"); }
          if (c.contains_all?.length) { checks++; const ok=c.contains_all.every(x=>output.toLowerCase().includes(x.toLowerCase())); if(ok) passedChecks++; else feedback.push("contains_all failed"); }
          if (c.regex) { checks++; try { if(new RegExp(c.regex,"i").test(output)) passedChecks++; else feedback.push("regex failed"); } catch { feedback.push("invalid regex criterion"); } }
          if (c.max_length !== undefined) { checks++; if(output.length<=c.max_length) passedChecks++; else feedback.push("max_length failed"); }
          if (c.must_not_contain?.length) { checks++; if(!c.must_not_contain.some(x=>output.toLowerCase().includes(x.toLowerCase()))) passedChecks++; else feedback.push("must_not_contain failed"); }
        } else {
          feedback.push("No valid deterministic criteria supplied");
        }
        const score = checks ? passedChecks / checks : 0;
        results.push({caseId:testCase.id,input:testCase.input,output,passed:checks>0 && score===1,score,feedback:feedback.join("; ") || "passed"});
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
