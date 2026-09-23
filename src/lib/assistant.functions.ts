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

    const [bookingsRes, servicesRes, staffRes, customersRes, knowledgeRes] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "start_time, end_time, status, payment_status, price, service:services(name), staff:staff(name), customer:customers(name)",
        )
        .eq("business_id", businessId)
        .order("start_time", { ascending: false })
        .limit(500),
      supabase
        .from("services")
        .select("name, price, duration_minutes, is_active, category")
        .eq("business_id", businessId)
        .limit(200),
      supabase
        .from("staff")
        .select("name, role, is_active")
        .eq("business_id", businessId)
        .limit(200),
      supabase.from("customers").select("id").eq("business_id", businessId).limit(2000),
      supabase.rpc("search_ai_knowledge_text", {
        p_business_id: businessId,
        p_query: data.question,
        p_match_count: 8,
      }),
    ]);

    const queryError = memoryRes.error ?? historyRes.error ?? bookingsRes.error ?? servicesRes.error ?? staffRes.error ?? customersRes.error ?? knowledgeRes.error;
    if (queryError) {
      console.error("[assistant] data query failed", queryError.message);
      return { answer: null, error: "I could not read your business data just now." };
    }

    const bookings = bookingsRes.data;
    const services = servicesRes.data;
    const staff = staffRes.data;
    const customers = customersRes.data;
    const knowledge = (knowledgeRes.data ?? []).map((item) => ({
      sourceId: item.source_id,
      content: item.content,
      rank: Number(item.rank ?? 0),
      metadata: item.metadata,
    }));

    const rows = bookings ?? [];
    const paid = rows.filter((b) => b.payment_status === "paid");
    const revenue = paid.reduce((sum, b) => sum + Number(b.price ?? 0), 0);
    const outstanding = rows
      .filter((b) => b.payment_status !== "paid" && b.status !== "cancelled")
      .reduce((sum, b) => sum + Number(b.price ?? 0), 0);

    const byStatus = rows.reduce<Record<string, number>>((acc, b) => {
      const key = b.status ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const snapshot = {
      business: {
        name: business.name,
        currency: business.currency ?? "USD",
        timezone: business.timezone ?? "UTC",
      },
      today: new Date().toISOString(),
      totals: {
        bookings: rows.length,
        customers: customers?.length ?? 0,
        services: services?.length ?? 0,
        staff: staff?.length ?? 0,
        paidBookings: paid.length,
        revenuePaid: Number(revenue.toFixed(2)),
        outstandingBalance: Number(outstanding.toFixed(2)),
        byStatus,
      },
      services: services ?? [],
      staff: staff ?? [],
      agentMemory: (memoryRes.data ?? []).map((m) => ({ type: m.memory_type, content: m.content, confidence: m.confidence })).slice(0, 40),
      recentConversation: [...(historyRes.data ?? [])].reverse().slice(-20),
      recentBookings: rows.slice(0, 120).map((b) => ({
        start: b.start_time,
        status: b.status,
        payment: b.payment_status,
        price: Number(b.price ?? 0),
        service: (b as { service?: { name?: string } | null }).service?.name ?? null,
        staff: (b as { staff?: { name?: string } | null }).staff?.name ?? null,
        customer: (b as { customer?: { name?: string } | null }).customer?.name ?? null,
      })),
    };

    const { createLovableResponsesProvider } = await import("./ai-gateway.server");
    const lovable = createLovableResponsesProvider(apiKey);
    const language = LANGUAGE_NAMES[data.language] ?? "English";

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
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
          "Answer strictly from the JSON business snapshot, retrieved business knowledge, approved agent memory, and recent conversation given in the user message.",
          "Never invent numbers or policies. If the provided snapshot/knowledge does not contain the answer, say so plainly.",
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
