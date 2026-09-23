import { useEffect, useState } from "react";
import { BookOpen, FileText, Globe, Plus, RefreshCw, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Source = {
  id: string;
  name: string;
  source_type: string;
  source_url: string | null;
  content_text: string | null;
  status: string;
  created_at: string;
};

export function AITrainer() {
  const { business } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"text" | "faq" | "url" | "policy">("text");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_knowledge_sources")
      .select("id,name,source_type,source_url,content_text,status,created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (!error) setSources((data ?? []) as Source[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [business]);

  const addSource = async () => {
    if (!business || !name.trim() || (!content.trim() && !url.trim())) return;
    setSaving(true);
    const { error } = await supabase.from("ai_knowledge_sources").insert({
      business_id: business.id,
      name: name.trim(),
      source_type: type,
      source_url: url.trim() || null,
      content_text: content.trim() || null,
      status: "active",
    });
    if (!error) {
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
                      <p className="mt-1 text-xs text-gray-500">{source.source_type} · {source.status}</p>
                      {source.content_text && <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{source.content_text}</p>}
                    </div>
                    <button className="icon-button text-error-600" title="Delete source" onClick={() => void remove(source.id)}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PlanGate>
  );
}
