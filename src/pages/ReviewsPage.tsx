import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Review = { id: string; rating: number; title: string | null; body: string | null; status: string; response: string | null; created_at: string };

export function ReviewsPage() {
  const { business } = useAuth();
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!business) return;
    setLoading(true);
    const { data, error } = await supabase.from("reviews").select("id,rating,title,body,status,response,created_at").eq("business_id", business.id).order("created_at", { ascending: false });
    if (!error) setItems((data ?? []) as Review[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [business]);

  return <PlanGate minimumPlan="pro" featureName="Reviews">
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold">Reviews & Reputation</h1><p className="mt-1 text-sm text-gray-500">Monitor customer feedback and prepare responses from one workspace.</p></div>
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div><h2 className="font-semibold">Customer reviews</h2><p className="text-xs text-gray-500">{items.length} review{items.length === 1 ? "" : "s"}</p></div><button className="btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>{items.length === 0 ? <div className="p-10 text-center text-sm text-gray-500"><MessageSquare className="mx-auto mb-2" />No reviews yet.</div> : <div className="divide-y divide-gray-100 dark:divide-gray-800">{items.map((r) => <article key={r.id} className="p-5"><div className="flex items-center gap-1 text-warning-500">{Array.from({length:5},(_,i)=><Star key={i} size={15} fill={i<r.rating ? "currentColor":"none"} />)}</div><h3 className="mt-2 font-semibold">{r.title || "Customer review"}</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{r.body || "No written feedback."}</p>{r.response && <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800/50"><span className="font-medium">Business response:</span> {r.response}</div>}</article>)}</div>}</section>
    </div>
  </PlanGate>;
}
