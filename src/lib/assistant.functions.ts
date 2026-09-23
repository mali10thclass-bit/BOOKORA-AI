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
    const lovable = createLovableResponsesProvider(apiKey);\n    const runtimeModel = typeof runtimeModelRes.data === "string" ? runtimeModelRes.data : "openai/gpt-6-astra";
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
            content: `Business data snapshot (JSON):\n${JSON.stringify(snapshot)}\n\nQuestion: ${data.question}`,
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
