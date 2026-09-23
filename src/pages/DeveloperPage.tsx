import { useEffect, useState } from "react";
import { Code2, KeyRound, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";

type Key = { id: string; name: string; key_prefix: string; scopes: string[]; revoked_at: string | null; expires_at: string | null };
type Hook = { id: string; name: string; endpoint_url: string; events: string[]; is_active: boolean };

function randomSecret(prefix: string) {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return prefix + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function DeveloperPage() {
  const { business } = useAuth();
  const [keys, setKeys] = useState<Key[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [keyName, setKeyName] = useState("");
  const [hookName, setHookName] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [newSecret, setNewSecret] = useState("");

  const load = async () => {
    if (!business) return;
    const [k, h] = await Promise.all([
      supabase.from("api_keys").select("id,name,key_prefix,scopes,revoked_at,expires_at").eq("business_id", business.id).order("created_at", { ascending: false }),
      supabase.from("webhooks").select("id,name,endpoint_url,events,is_active").eq("business_id", business.id).order("created_at", { ascending: false }),
    ]);
    if (!k.error) setKeys((k.data ?? []) as Key[]);
    if (!h.error) setHooks((h.data ?? []) as Hook[]);
  };
  useEffect(() => { void load(); }, [business]);

  const createKey = async () => {
    if (!business || !keyName.trim()) return;
    const secret = randomSecret("bk_");
    const { error } = await supabase.from("api_keys").insert({ business_id: business.id, name: keyName.trim(), key_prefix: secret.slice(0, 11), key_hash: await sha256(secret), scopes: ["read"], created_by: (await supabase.auth.getUser()).data.user?.id });
    if (!error) { setNewSecret(secret); setKeyName(""); await load(); }
  };
  const createHook = async () => {
    if (!business || !hookName.trim() || !hookUrl.trim()) return;
    const secret = randomSecret("wh_");
    const { error } = await supabase.from("webhooks").insert({ business_id: business.id, name: hookName.trim(), endpoint_url: hookUrl.trim(), secret, events: ["booking.created","booking.updated"] });
    if (!error) { setHookName(""); setHookUrl(""); await load(); }
  };
  const revokeKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (!error) await load();
  };
  const removeHook = async (id: string) => {
    const { error } = await supabase.from("webhooks").delete().eq("id", id);
    if (!error) await load();
  };

  return <PlanGate minimumPlan="ultimate" featureName="Developer Platform">
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-bold">Developer Platform</h1><p className="mt-1 text-sm text-gray-500">API keys, webhook endpoints and the foundation for an embeddable BOOKORA API.</p></div>
      {newSecret && <div className="rounded-xl border border-warning-300 bg-warning-50 p-4 text-sm dark:bg-warning-900/20"><b>Copy this API key now:</b> <code className="break-all">{newSecret}</code><p className="mt-1 text-xs">It is not stored in plaintext; this value will not be shown again.</p></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><div className="flex items-center gap-2"><KeyRound size={18} className="text-primary-600" /><h2 className="font-semibold">API keys</h2></div><div className="mt-4 flex gap-2"><input className="input" placeholder="Key name" value={keyName} onChange={(e) => setKeyName(e.target.value)} /><button className="btn-primary" disabled={!keyName.trim()} onClick={() => void createKey()}><Plus size={15} /> Create</button></div><div className="mt-4 space-y-2">{keys.map((k) => <div key={k.id} className="flex items-center gap-2 rounded-lg border p-3"><Code2 size={16} /><div className="flex-1"><p className="text-sm font-medium">{k.name}</p><p className="text-xs text-gray-500">{k.key_prefix}… · {k.revoked_at ? "revoked" : "active"}</p></div>{!k.revoked_at && <button className="icon-button text-error-600" onClick={() => void revokeKey(k.id)}><Trash2 size={15} /></button>}</div>)}</div></section>
        <section className="card p-5"><div className="flex items-center gap-2"><Webhook size={18} className="text-primary-600" /><h2 className="font-semibold">Signed webhooks</h2></div><div className="mt-4 space-y-2"><input className="input" placeholder="Endpoint name" value={hookName} onChange={(e) => setHookName(e.target.value)} /><input className="input" placeholder="https://your-app.com/webhooks/bookora" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} /><button className="btn-primary" disabled={!hookName.trim() || !hookUrl.trim()} onClick={() => void createHook()}><Plus size={15} /> Add endpoint</button></div><div className="mt-4 space-y-2">{hooks.map((h) => <div key={h.id} className="flex items-center gap-2 rounded-lg border p-3"><Webhook size={16} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{h.name}</p><p className="truncate text-xs text-gray-500">{h.endpoint_url}</p></div><button className="icon-button text-error-600" onClick={() => void removeHook(h.id)}><Trash2 size={15} /></button></div>)}</div></section>
      </div>
      <section className="card p-5"><h2 className="font-semibold">API roadmap</h2><p className="mt-2 text-sm leading-6 text-gray-500">Next layers: signed request verification, scoped read/write endpoints, webhook delivery retries, idempotency keys, rate limits and a public developer reference.</p></section>
    </div>
  </PlanGate>;
}
