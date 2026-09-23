import { useEffect, useState } from "react";
import { ClipboardList, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Form = { id: string; name: string; description: string | null; schema: unknown; is_active: boolean };

export function FormsPage() {
  const { business } = useAuth();
  const [items, setItems] = useState<Form[]>([]);
  const [name, setName] = useState("");
  const [schema, setSchema] = useState('[{"label":"Your question","type":"text","required":true}]');
  const load = async () => { if (!business) return; const { data, error } = await supabase.from("forms").select("id,name,description,schema,is_active").eq("business_id", business.id).order("name"); if (!error) setItems((data ?? []) as Form[]); };
  useEffect(()=>{void load();},[business]);
  const add = async () => { if (!business || !name.trim()) return; let parsed: unknown; try { parsed=JSON.parse(schema); } catch { return; } const { error }=await supabase.from("forms").insert({business_id:business.id,name:name.trim(),schema:parsed}); if(!error){setName("");await load();} };
  const remove=async(id:string)=>{const {error}=await supabase.from("forms").delete().eq("id",id);if(!error)setItems(x=>x.filter((item)=>item.id!==id));};
  return <PlanGate minimumPlan="pro" featureName="Forms & Intake"><div className="mx-auto max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold">Forms & Intake</h1><p className="mt-1 text-sm text-gray-500">Create structured intake forms that can be attached to bookings and customer records.</p></div>
    <section className="card p-5"><input className="input" placeholder="Form name" value={name} onChange={e=>setName(e.target.value)}/><textarea className="input mt-3 min-h-32 font-mono text-xs" value={schema} onChange={e=>setSchema(e.target.value)}/><button className="btn-primary mt-3" disabled={!name.trim()} onClick={()=>void add()}><Plus size={15}/> Create form</button></section>
    <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h2 className="font-semibold">Intake forms</h2><button className="btn-secondary" onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>{items.length===0?<div className="p-10 text-center text-sm text-gray-500"><ClipboardList className="mx-auto mb-2"/>No forms yet.</div>:<div className="divide-y divide-gray-100 dark:divide-gray-800">{items.map((item)=><div key={item.id} className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/20"><ClipboardList size={16}/></div><div className="flex-1"><p className="font-medium">{item.name}</p><p className="text-xs text-gray-500">{Array.isArray(item.schema)?item.schema.length:0} fields · {item.is_active?"active":"inactive"}</p></div><button className="icon-button text-error-600" onClick={()=>void remove(item.id)}><Trash2 size={16}/></button></div>)}</div>}</section>
  </div></PlanGate>;
}
