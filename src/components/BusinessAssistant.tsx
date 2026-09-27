import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Hand, Send, ShieldCheck, XCircle } from "lucide-react";
import { askBusinessAssistant } from "@/lib/assistant.functions";
import { executeAgentTool, requestHumanHandoff } from "@/lib/agent-tools/agent-tools.functions";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";

interface ToolActivity {
  toolName: string;
  status: string;
  summary: string;
}

interface PendingAction {
  proposalId: string;
  toolName: string;
  summary: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolActivity?: ToolActivity[];
  handoff?: boolean;
}

const GREETING: Record<string, string> = {
  en: "Ask me anything about your bookings, revenue, customers or staff.",
  ur: "اپنی بکنگز، آمدنی، گاہکوں یا عملے کے بارے میں کچھ بھی پوچھیں۔",
  ar: "اسألني أي شيء عن الحجوزات والإيرادات والعملاء والموظفين.",
  es: "Pregúntame lo que quieras sobre tus reservas, ingresos, clientes o personal.",
  fr: "Posez-moi vos questions sur vos réservations, revenus, clients ou équipe.",
};

const SUGGESTIONS: Record<string, string[]> = {
  en: [
    "How many bookings this week?",
    "What is my revenue so far?",
    "Who are my top customers?",
    "Which staff member is busiest?",
  ],
  ur: [
    "اس ہفتے کتنی بکنگز ہوئیں؟",
    "اب تک میری کل آمدنی کتنی ہے؟",
    "میرے سب سے اہم گاہک کون ہیں؟",
    "سب سے مصروف عملہ کون ہے؟",
  ],
  ar: [
    "كم حجزًا هذا الأسبوع؟",
    "ما إجمالي إيراداتي؟",
    "من هم أفضل عملائي؟",
    "من أكثر الموظفين انشغالًا؟",
  ],
  es: [
    "¿Cuántas reservas esta semana?",
    "¿Cuáles son mis ingresos?",
    "¿Quiénes son mis mejores clientes?",
    "¿Qué empleado está más ocupado?",
  ],
  fr: [
    "Combien de réservations cette semaine ?",
    "Quel est mon chiffre d’affaires ?",
    "Qui sont mes meilleurs clients ?",
    "Quel employé est le plus occupé ?",
  ],
};

const LABELS: Record<string, Record<string, string>> = {
  en: {
    handoff: "Talk to a human",
    handoffDone: "A human team member has been notified and will continue this conversation.",
    handoffFail: "Could not open a human handoff right now.",
    confirm: "Confirm",
    cancel: "Cancel",
    confirmTitle: "Confirmation required",
    toolActivity: "Agent activity",
    unavailable: "The assistant is unavailable right now.",
  },
  ur: {
    handoff: "کسی انسان سے بات کریں",
    handoffDone: "ٹیم کے انسانی رکن کو اطلاع دے دی گئی ہے۔ وہ اس گفتگو کو جاری رکھیں گے۔",
    handoffFail: "ابھی انسانی رابطہ نہیں ہو سکا۔",
    confirm: "تصدیق کریں",
    cancel: "منسوخ",
    confirmTitle: "تصدیق درکار ہے",
    toolActivity: "ایجنٹ سرگرمی",
    unavailable: "اسیستنٹ ابھی دستیاب نہیں ہے۔",
  },
  ar: {
    handoff: "التحدث إلى موظف",
    handoffDone: "تم إبلاغ أحد أعضاء الفريق وسيستمر في المحادثة.",
    handoffFail: "تعذر فتح تحويل إلى موظف الآن.",
    confirm: "تأكيد",
    cancel: "إلغاء",
    confirmTitle: "مطلوب تأكيد",
    toolActivity: "نشاط الوكيل",
    unavailable: "المساعد غير متاح الآن.",
  },
  es: {
    handoff: "Hablar con una persona",
    handoffDone: "Se ha avisado a un miembro del equipo y continuará esta conversación.",
    handoffFail: "No se pudo abrir la derivación a una persona.",
    confirm: "Confirmar",
    cancel: "Cancelar",
    confirmTitle: "Confirmación requerida",
    toolActivity: "Actividad del agente",
    unavailable: "El asistente no está disponible ahora.",
  },
  fr: {
    handoff: "Parler à un humain",
    handoffDone: "Un membre de l’équipe a été prévienu et poursuivra cette conversation.",
    handoffFail: "Impossible d’ouvrir une escalade humaine pour le moment.",
    confirm: "Confirmer",
    cancel: "Annuler",
    confirmTitle: "Confirmation requise",
    toolActivity: "Activité de l’agent",
    unavailable: "L’assistant est indisponible pour le moment.",
  },
};

function label(lang: string, key: string): string {
  return LABELS[lang]?.[key] ?? LABELS["en"]?.[key] ?? key;
}

export function BusinessAssistant({ compact = false }: { compact?: boolean }) {
  const { lang, dir } = useI18n();
  const { business } = useAuth();
  const ask = useServerFn(askBusinessAssistant);
  const confirmTool = useServerFn(executeAgentTool);
  const handoffFn = useServerFn(requestHumanHandoff);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const greeting = GREETING[lang] ?? GREETING["en"]!;
  const suggestions = SUGGESTIONS[lang] ?? SUGGESTIONS["en"]!;

  useEffect(() => {
    setMessages([{ role: "assistant", content: greeting }]);
  }, [greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setLoading(true);
    try {
      const result = await ask({ data: { question: content, language: lang } });
      if (result.pendingAction) {
        setPendingAction({
          proposalId: result.pendingAction.proposalId,
          toolName: result.pendingAction.toolName,
          summary: result.pendingAction.summary,
        });
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.answer ?? result.error ?? "No answer.",
          toolActivity: result.toolActivity ?? [],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: label(lang, "unavailable") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction || confirming) return;
    setConfirming(true);
    try {
      const { result, error } = await confirmTool({
        data: {
          toolName: pendingAction.toolName,
          input: {},
          mode: "commit",
          proposalId: pendingAction.proposalId,
        },
      });
      const outcome =
        result?.status === "completed"
          ? `✅ ${result.summary}`
          : `⚠️ ${result && "error" in result ? result.error : error ?? label(lang, "unavailable")}`;
      setMessages((m) => [...m, { role: "assistant", content: outcome }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: label(lang, "unavailable") }]);
    } finally {
      setConfirming(false);
      setPendingAction(null);
    }
  };

  const requestHandoff = async () => {
    if (handoffBusy) return;
    setHandoffBusy(true);
    try {
      const { handoff, error } = await handoffFn({
        data: {
          reason: "User requested a human from the chat",
          summary: messages
            .slice(-6)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")
            .slice(0, 1500),
        },
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: handoff ? label(lang, "handoffDone") : (error ?? label(lang, "handoffFail")),
          handoff: Boolean(handoff),
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: label(lang, "handoffFail") }]);
    } finally {
      setHandoffBusy(false);
    }
  };

  return (
    <div className="card p-4 flex flex-col gap-3" dir={dir}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
          <Bot size={16} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">AI business assistant</h2>
          <p className="text-xs text-gray-500">
            {business?.name
              ? `Answers from ${business.name}'s own data`
              : "Answers from your own data"}
          </p>
        </div>
        <button
          onClick={requestHandoff}
          disabled={handoffBusy}
          className="text-xs inline-flex items-center gap-1 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 hover:border-primary-300 transition-colors"
          title={label(lang, "handoff")}
        >
          <Hand size={14} />
          {label(lang, "handoff")}
        </button>
      </div>

      <div
        ref={scrollRef}
        className={`overflow-y-auto space-y-3 pr-1 ${compact ? "h-64" : "flex-1 min-h-[16rem]"}`}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              {msg.content}
              {msg.toolActivity && msg.toolActivity.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    {label(lang, "toolActivity")}
                  </div>
                  {msg.toolActivity.map((t, j) => (
                    <div key={j} className="text-xs text-gray-500 dark:text-gray-400">
                      <span
                        className={
                          t.status === "completed"
                            ? "text-green-600 dark:text-green-400"
                            : t.status === "confirmation_required"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-gray-500"
                        }
                      >
                        {t.status === "completed" ? "✓" : t.status === "confirmation_required" ? "⏳" : "✗"}
                      </span>{" "}
                      {t.summary}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                <span
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <ShieldCheck size={14} />
            {label(lang, "confirmTitle")}
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">{pendingAction.summary}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={confirmAction}
              disabled={confirming}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {label(lang, "confirm")}
            </button>
            <button
              onClick={() => setPendingAction(null)}
              disabled={confirming}
              className="text-xs inline-flex items-center gap-1 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5"
            >
              <XCircle size={12} />
              {label(lang, "cancel")}
            </button>
          </div>
        </div>
      )}

      {messages.length <= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s)}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-2 text-xs text-left hover:border-primary-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
          placeholder={greeting}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
