import { useEffect, useState } from "react";
import { BookOpen, FileText, Globe, Plus, RefreshCw, Trash2, Sparkles, Play, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";
import { askBusinessAssistant } from "@/lib/assistant.functions";
import { useServerFn } from "@tanstack/react-start";

type Source = {
  id: string;
  name: string;
  source_type: string;
  content: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

export function AITrainer() {
  const { business } = useAuth();
  const ask = useServerFn(askBusinessAssistant);
  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "faq" | "url" | "policy">("text");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPrompt, setTestPrompt] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [testing, setTesting] = useState(false);
  const [indexingId, setIndexingId] = useState<string | null>(null);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_knowledge_sources")
      .select("id,name,source_type,content,metadata,is_active,created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (!error) setSources((data ?? []) as Source[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [business]);

  const addSource = async () => {
    if (!business || !name.trim() || (!content.trim() && !url.trim())) return;
    setSaving(true);
    const { data: inserted, error } = await supabase.from("ai_knowledge_sources").insert({
      business_id: business.id,
      name: name.trim(),
      source_type: type,
      content: content.trim() || url.trim(),
      metadata: url.trim() ? { url: url.trim(), ingestion: "pending" } : { ingestion: "manual" },
      is_active: true,
    });
    if (!error && inserted?.id) {
      await supabase.rpc("index_ai_knowledge_source", { p_source_id: inserted.id });
      setName(""); setUrl(""); setContent("");
      await load();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("ai_knowledge_sources").delete().eq("id", id);
    if (!error) setSources((items) => items.filter((item) => item.id !== id));
  };

  return (
    <PlanGate minimumPlan="pro" featureName="AI Trainer">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-gray-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600"><Sparkles size={22} /></div>
            <div>
              <h1 className="text-2xl font-bold">AI Trainer</h1>
              <p className="text-sm text-gray-400">Build BOOKORA's business-specific knowledge before deploying an AI agent.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Train", "Test", "Deploy"].map((step, i) => (
              <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-primary-200">0{i + 1}</p>
                <p className="mt-1 font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="card p-5">
            <div className="flex items-center gap-2"><Plus size={18} className="text-primary-600" /><h2 className="font-semibold">Add knowledge</h2></div>
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Source name" value={name} onChange={(e) => setName(e.target.value)} />
              <select className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="text">Business information</option>
                <option value="faq">FAQ</option>
                <option value="policy">Policy</option>
                <option value="url">Website URL</option>
              </select>
              {type === "url" && <input className="input" placeholder="https://example.com/faq" value={url} onChange={(e) => setUrl(e.target.value)} />}
              <textarea className="input min-h-36" placeholder="Paste business knowledge, FAQs, policies, service details..." value={content} onChange={(e) => setContent(e.target.value)} />
              <button className="btn-primary w-full justify-center" disabled={saving || !name.trim() || (!content.trim() && !url.trim())} onClick={() => void addSource()}>
                <Plus size={15} /> {saving ? "Saving..." : "Add source"}
              </button>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div><h2 className="font-semibold">Knowledge sources</h2><p className="text-xs text-gray-500">{sources.length} source{sources.length === 1 ? "" : "s"}</p></div>
              <button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
            {sources.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-500"><BookOpen size={28} className="mx-auto mb-2 opacity-50" />No training data yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sources.map((source) => (
                  <div key={source.id} className="flex gap-3 p-4">
                    <div className="mt-0.5 rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20">
                      {source.source_type === "url" ? <Globe size={16} /> : <FileText size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{source.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{source.source_type} · {source.is_active ? "active" : "disabled"}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{source.content}</p>
                      <button
                        className="mt-3 btn-secondary"
                        disabled={indexingId === source.id}
                        onClick={() => void (async () => {
                          setIndexingId(source.id);
                          await supabase.rpc("index_ai_knowledge_source", { p_source_id: source.id });
                          setIndexingId(null);
                        })()}
                      >
                        <RefreshCw size={14} className={indexingId === source.id ? "animate-spin" : ""} />
                        {indexingId === source.id ? "Queueing..." : "Index for AI"}
                      </button>
                    </div>
                    <button className="icon-button text-error-600" title="Delete source" onClick={() => void remove(source.id)}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="card p-5">
          <div className="flex items-center gap-2"><Play size={18} className="text-primary-600" /><h2 className="font-semibold">Agent evaluation lab</h2></div>
          <p className="mt-1 text-xs text-gray-500">Run a real BOOKORA assistant query against the current business context and keep the result as a training run.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <textarea className="input min-h-28" placeholder="Test prompt, e.g. What are our cancellation rules?" value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} />
              <button className="btn-primary" disabled={!testPrompt.trim() || testing} onClick={() => void (async () => {
                if (!business || !testPrompt.trim()) return;
                setTesting(true); setTestAnswer("");
                try {
                  const result = await ask({ data: { question: testPrompt.trim(), language: "en" } });
                  const answer = result.answer ?? result.error ?? "No answer.";
                  setTestAnswer(answer);
                  await supabase.rpc("record_ai_training_run", { p_business_id: business.id, p_prompt: testPrompt.trim(), p_expected_answer: null, p_actual_answer: answer, p_score: null });
                } finally { setTesting(false); }
              })()}><Play size={15} /> {testing ? "Testing..." : "Run evaluation"}</button>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-primary-600" />Latest result</div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{testAnswer || "Run a test to capture the assistant response."}</p>
            </div>
          </div>
        </section>
      </div>
    </PlanGate>
  );
}
