import { useEffect, useState } from "react";
import { Gift, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Package = { id: string; name: string; description: string | null; price: number; validity_days: number | null; credits: number; is_active: boolean };

export function PackagesPage() {
  const { business } = useAuth();
  const [items, setItems] = useState<Package[]>([]);
  const [name, setName] = useState(""); const [price, setPrice] = useState("0"); const [credits, setCredits] = useState("1"); const [validity, setValidity] = useState("30");
  const load = async () => { if (!business) return; const { data, error } = await supabase.from("packages").select("id,name,description,price,validity_days,credits,is_active").eq("business_id", business.id).order("name"); if (!error) setItems((data ?? []) as Package[]); };
  useEffect(() => { void load(); }, [business]);
  const add = async () => { if (!business || !name.trim()) return; const { error } = await supabase.from("packages").insert({ business_id: business.id, name: name.trim(), price: Math.max(0, Number(price)||0), credits: Math.max(0, Number(credits)||0), validity_days: Math.max(1, Number(validity)||30) }); if (!error) { setName(""); setPrice("0"); setCredits("1"); setValidity("30"); await load(); } };
  const remove = async (id: string) => { const { error } = await supabase.from("packages").delete().eq("id", id); if (!error) setItems((x) => x.filter((item) => item.id !== id)); };
  return <PlanGate minimumPlan="pro" featureName="Packages & Memberships"><div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold">Packages & Memberships</h1><p className="mt-1 text-sm text-gray-500">Sell prepaid service credits and membership-style packages.</p></div>
    <section className="card p-5"><div className="grid gap-3 md:grid-cols-4"><input className="input" placeholder="Package name" value={name} onChange={(e)=>setName(e.target.value)} /><input className="input" type="number" min="0" placeholder="Price" value={price} onChange={(e)=>setPrice(e.target.value)} /><input className="input" type="number" min="0" placeholder="Credits" value={credits} onChange={(e)=>setCredits(e.target.value)} /><input className="input" type="number" min="1" placeholder="Validity days" value={validity} onChange={(e)=>setValidity(e.target.value)} /></div><button className="btn-primary mt-3" disabled={!name.trim()} onClick={()=>void add()}><Plus size={15}/> Add package</button></section>
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h2 className="font-semibold">Packages</h2><button className="btn-secondary" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>{items.length===0?<div className="p-10 text-center text-sm text-gray-500"><Gift className="mx-auto mb-2"/>No packages yet.</div>:<div className="divide-y divide-gray-100 dark:divide-gray-800">{items.map((item)=><div key={item.id} className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20"><Gift size={16}/></div><div className="flex-1"><p className="font-medium">{item.name}</p><p className="text-xs text-gray-500">{item.credits} credits · {item.validity_days} days · ${Number(item.price).toFixed(2)}</p></div><button className="icon-button text-error-600" onClick={()=>void remove(item.id)}><Trash2 size={16}/></button></div>)}</div>}</section>
  </div></PlanGate>;
}
