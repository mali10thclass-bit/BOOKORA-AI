import { useEffect, useState } from "react";
import { Clock3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Entry = { id: string; customer_id: string; service_id: string | null; status: string; priority: number; notes: string | null; created_at: string };
type Customer = { id: string; name: string };
type Service = { id: string; name: string };

export function Waitlist() {
  const { business } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("0");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const [w, c, s] = await Promise.all([
      supabase.from("waitlist_entries").select("id,customer_id,service_id,status,priority,notes,created_at").eq("business_id", business.id).order("priority", { ascending: false }).order("created_at", { ascending: true }),
      supabase.from("customers").select("id,name").eq("business_id", business.id).order("name"),
      supabase.from("services").select("id,name").eq("business_id", business.id).eq("is_active", true).order("name"),
    ]);
    if (!w.error) setEntries((w.data ?? []) as Entry[]);
    if (!c.error) setCustomers((c.data ?? []) as Customer[]);
    if (!s.error) setServices((s.data ?? []) as Service[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [business]);

  const add = async () => {
    if (!business || !customerId) return;
    const { error } = await supabase.from("waitlist_entries").insert({ business_id: business.id, customer_id: customerId, service_id: serviceId || null, notes: notes.trim() || null, priority: Number(priority) });
    if (!error) { setCustomerId(""); setServiceId(""); setNotes(""); setPriority("0"); await load(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("waitlist_entries").delete().eq("id", id);
    if (!error) setEntries((x) => x.filter((e) => e.id !== id));
  };
  const customerName = (id: string) => customers.find((x) => x.id === id)?.name ?? "Customer";
  const serviceName = (id: string | null) => services.find((x) => x.id === id)?.name ?? "Any service";

  return <PlanGate minimumPlan="pro" featureName="Waitlist">
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Intelligent Waitlist</h1><p className="mt-1 text-sm text-gray-500">Capture demand and prepare customers for newly available slots.</p></div>
      <section className="card p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}><option value="">Any service</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn-primary" disabled={!customerId} onClick={() => void add()}><Plus size={15} /> Add</button>
        </div>
        <select className="input mt-3" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="0">Normal priority</option><option value="25">High priority</option><option value="50">Very high priority</option><option value="100">VIP / urgent</option></select><textarea className="input mt-3 min-h-20" placeholder="Preference or notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </section>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div><h2 className="font-semibold">Waiting customers</h2><p className="text-xs text-gray-500">{entries.length} active requests</p></div><button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
        {entries.length === 0 ? <div className="p-10 text-center text-sm text-gray-500"><Clock3 className="mx-auto mb-2" />No waitlist entries.</div> : <div className="divide-y divide-gray-100 dark:divide-gray-800">{entries.map((e) => <div key={e.id} className="flex items-center gap-3 p-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/20"><Clock3 size={16} /></div><div className="min-w-0 flex-1"><p className="font-medium">{customerName(e.customer_id)}</p><p className="text-xs text-gray-500">{serviceName(e.service_id)} · {e.status}</p>{e.notes && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{e.notes}</p>}</div><button className="icon-button text-error-600" onClick={() => void remove(e.id)}><Trash2 size={16} /></button></div>)}</div>}
      </section>
    </div>
  </PlanGate>;
}
