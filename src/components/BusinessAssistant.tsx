import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Sparkles, Trash2 } from "lucide-react";
import { askBusinessAssistant } from "@/lib/assistant.functions";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";

interface Message {
  role: "user" | "assistant";
  content: string;
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

export function BusinessAssistant({ compact = false }: { compact?: boolean }) {
  const { lang, dir } = useI18n();
  const { business } = useAuth();
  const ask = useServerFn(askBusinessAssistant);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
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
    setShowSuggestions(false);
    setMessages((m) => [...m, { role: "user", content }]);
    setLoading(true);
    try {
      const result = await ask({ data: { question: content, language: lang } });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: result.answer ?? result.error ?? "No answer." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "The assistant is unavailable right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: greeting }]);
    setInput("");
    setShowSuggestions(true);
  };

  return (
    <div className="card p-4 flex flex-col gap-3" dir={dir}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
          <Bot size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">AI business assistant</h2>
          <div className="flex items-center gap-2 ml-auto">
            <Sparkles size={14} className="text-primary-500" />
            {!compact && messages.length > 1 && (
              <button onClick={clearChat} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Clear conversation" title="Clear conversation">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">
            {business?.name
              ? `Answers from ${business.name}'s own data`
              : "Answers from your own data"}
          </p>
        </div>
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

      {showSuggestions && messages.length <= 1 && (
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
          aria-label="Ask BOOKORA AI"
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
