import { FormEvent, useState } from "react";
import { Bot, Send } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

type Message = { role: "user" | "assistant"; content: string };

export function PublicAIChat() {
  const { publicKey } = Route.useParams();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I’m the BOOKORA AI business assistant. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    try {
      const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
      const response = await fetch(base + "/functions/v1/public-ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bookora-public-key": publicKey },
        body: JSON.stringify({ question, language: "en" }),
      });
      const payload = await response.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", content: payload.answer ?? payload.error ?? "I could not answer right now." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "The assistant is temporarily unavailable." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950">
      <section className="mx-auto flex min-h-[90vh] max-w-3xl flex-col overflow-hidden rounded-3xl border bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <header className="flex items-center gap-3 border-b p-5 dark:border-gray-800">
          <div className="rounded-2xl bg-primary-100 p-3 dark:bg-primary-950"><Bot /></div>
          <div><h1 className="font-bold">BOOKORA AI</h1><p className="text-sm text-gray-500">Business AI Assistant</p></div>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "ml-auto max-w-[80%] rounded-2xl bg-primary-600 p-3 text-white" : "max-w-[80%] rounded-2xl bg-gray-100 p-3 dark:bg-gray-800"}>
              {message.content}
            </div>
          ))}
          {busy && <div className="max-w-[80%] rounded-2xl bg-gray-100 p-3 text-sm dark:bg-gray-800">Thinking…</div>}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t p-4 dark:border-gray-800">
          <input className="input flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about services, booking, hours, or policies…" maxLength={2000} />
          <button className="btn-primary" disabled={busy || !input.trim()}><Send size={16} />Send</button>
        </form>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/ai-chat/$publicKey")({
  ssr: false,
  component: PublicAIChat,
});
