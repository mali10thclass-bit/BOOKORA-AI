/* eslint-disable prettier/prettier */
import { useEffect, useState } from "react";
import { Box, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Resource = { id: string; name: string; type: string; capacity: number; description: string | null; is_active: boolean };

export function ResourcesPage() {
  const { business } = useAuth();
  const [items, setItems] = useState<Resource[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("room");
  const [capacity, setCapacity] = useState("1");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error } = await supabase.from("resources").select("id,name,type,capacity,description,is_active").eq("business_id", business.id).order("name");
    if (!error) setItems((data ?? []) as Resource[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [business]);

  const add = async () => {
    if (!business || !name.trim()) return;
    const { error } = await supabase.from("resources").insert({ business_id: business.id, name: name.trim(), type, capacity: Math.max(1, Number(capacity) || 1) });
    if (!error) { setName(""); setCapacity("1"); await load(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (!error) setItems((x) => x.filter((r) => r.id !== id));
  };

  return <PlanGate minimumPlan="ultimate" featureName="Resources">
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Resources & Rooms</h1><p className="mt-1 text-sm text-gray-500">Track rooms, equipment and capacity that affect booking availability.</p></div>
      <section className="card p-5"><div className="grid gap-3 md:grid-cols-[1fr_180px_120px_auto]"><input className="input" placeholder="Resource name" value={name} onChange={(e) => setName(e.target.value)} /><select className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="room">Room</option><option value="equipment">Equipment</option><option value="capacity">Capacity</option></select><input className="input" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} /><button className="btn-primary" disabled={!name.trim()} onClick={() => void add()}><Plus size={15} /> Add</button></div></section>
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h2 className="font-semibold">Configured resources</h2><button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>{items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500"><Box className="mx-auto mb-2" />No resources yet.</div> : <div className="divide-y divide-gray-100 dark:divide-gray-800">{items.map((r) => <div key={r.id} className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20"><Box size={16} /></div><div className="flex-1"><p className="font-medium">{r.name}</p><p className="text-xs text-gray-500">{r.type} · capacity {r.capacity}</p></div><button className="icon-button text-error-600" onClick={() => void remove(r.id)}><Trash2 size={16} /></button></div>)}</div>}</section>
    </div>
  </PlanGate>;
}
