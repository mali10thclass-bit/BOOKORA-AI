/* eslint-disable prettier/prettier */
import { useEffect, useState } from "react";
import { GitBranch, Plus, Play, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";
import type { Json } from "@/integrations/supabase/types";

type Workflow = { id: string; name: string; description: string | null; trigger_type: string; definition: Record<string, unknown>; is_active: boolean; created_at: string };

export function AutomationsPage() {
  const { business } = useAuth();
  const [items, setItems] = useState<Workflow[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("booking.created");
  const [definition, setDefinition] = useState('{"steps":[]}');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!business) return;
    const { data, error } = await supabase.from("automation_workflows").select("id,name,description,trigger_type,definition,is_active,created_at").eq("business_id", business.id).order("created_at", { ascending: false });
    if (!error) setItems((data ?? []) as Workflow[]);
  };
  useEffect(() => { void load(); }, [business]);

  const add = async () => {
    if (!business || !name.trim()) return;
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(definition) as Record<string, unknown>; } catch { return; }
    setSaving(true);
    const { error } = await supabase.from("automation_workflows").insert({ business_id: business.id, name: name.trim(), trigger_type: trigger, definition: parsed as Json, is_active: false });
    if (!error) { setName(""); setDefinition('{"steps":[]}'); await load(); }
    setSaving(false);
  };
  const toggle = async (item: Workflow) => {
    const { error } = await supabase.from("automation_workflows").update({ is_active: !item.is_active }).eq("id", item.id);
    if (!error) setItems((x) => x.map((w) => w.id === item.id ? { ...w, is_active: !w.is_active } : w));
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("automation_workflows").delete().eq("id", id);
    if (!error) setItems((x) => x.filter((w) => w.id !== id));
  };

  return <PlanGate minimumPlan="pro" featureName="Automation Builder">
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-bold">Automation Builder</h1><p className="mt-1 text-sm text-gray-500">Create event-driven workflows. Execution must happen server-side with authorization and audit logging.</p></div>
      <section className="card p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            <option value="booking.created">Booking created</option><option value="booking.cancelled">Booking cancelled</option><option value="booking.no_show">No-show</option><option value="customer.created">Customer created</option><option value="payment.updated">Payment updated</option>
          </select>
        </div>
        <textarea className="input mt-3 min-h-36 font-mono text-xs" value={definition} onChange={(e) => setDefinition(e.target.value)} />
        <button className="btn-primary mt-3" disabled={saving || !name.trim()} onClick={() => void add()}><Plus size={15} /> {saving ? "Saving..." : "Create workflow"}</button>
      </section>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h2 className="font-semibold">Workflows</h2><button className="btn-secondary" onClick={() => void load()}><RefreshCw size={15} /> Refresh</button></div>
        {items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500"><GitBranch className="mx-auto mb-2" />No workflows configured.</div> : <div className="divide-y divide-gray-100 dark:divide-gray-800">{items.map((w) => <div key={w.id} className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20"><GitBranch size={16} /></div><div className="min-w-0 flex-1"><p className="font-medium">{w.name}</p><p className="text-xs text-gray-500">{w.trigger_type} · {w.is_active ? "active" : "draft"}</p></div><button className="btn-secondary" onClick={() => void toggle(w)}><Play size={14} /> {w.is_active ? "Pause" : "Activate"}</button><button className="icon-button text-error-600" onClick={() => void remove(w.id)}><Trash2 size={16} /></button></div>)}</div>}
      </section>
    </div>
  </PlanGate>;
}
