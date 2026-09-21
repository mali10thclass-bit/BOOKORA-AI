import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { streamText } from "ai";
import { z } from "zod";

const AskInput = z.object({
  question: z.string().min(1).max(2000),
  language: z.enum(["en", "ur", "ar", "es", "fr"]).default("en"),
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

    if (!business || !["pro", "ultimate"].includes(business.plan ?? "free")) {
      return {
        answer: null,
        error: "AI Assistant is available on Pro and Ultimate plans. Upgrade through billing to continue.",
      };
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { answer: null, error: "AI is not configured for this project yet." };
    }

    const businessId = member.business_id;

    const [bookingsRes, servicesRes, staffRes, customersRes] = await Promise.all([
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
    ]);

    const queryError =
      bookingsRes.error ?? servicesRes.error ?? staffRes.error ?? customersRes.error;
    if (queryError) {
      console.error("[assistant] data query failed", queryError.message);
      return { answer: null, error: "I could not read your business data just now." };
    }

    const bookings = bookingsRes.data;
    const services = servicesRes.data;
    const staff = staffRes.data;
    const customers = customersRes.data;

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
          "Answer strictly from the JSON business snapshot given by the user message.",
          "Never invent numbers. If the snapshot does not contain the answer, say so plainly.",
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
