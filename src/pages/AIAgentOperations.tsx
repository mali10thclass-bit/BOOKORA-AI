import { useEffect, useState } from "react";
import { Bot, CalendarClock, CheckCircle2, Hand, Plus, ShieldCheck, Wrench } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";
import { Protected } from "@/components/Protected";

type Agent = { id: string; name: string };
type Tool = { id: string; agent_id: string; name: string; tool_type: string; approval_required: boolean; enabled: boolean };
type Handoff = { id: string; agent_id: string; reason: string; status: string; notes: string | null };
type Deployment = { id: string; agent_id: string; channel: string; public_key: string | null; enabled: boolean };

export function AIAgentOperations() {
  const { business, membership } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!business) return;
    const [a,t,h,d] = await Promise.all([
      supabase.from("ai_agents").select("id,name").eq("business_id", business.id).neq("status","archived").order("name"),
      supabase.from("ai_agent_tools").select("id,agent_id,name,tool_type,approval_required,enabled").eq("business_id",business.id).order("created_at",{ascending:false}),
      supabase.from("ai_agent_handoffs").select("id,agent_id,reason,status,notes").eq("business_id",business.id).order("created_at",{ascending:false}).limit(30),
      supabase.from("ai_agent_deployments").select("id,agent_id,channel,public_key,enabled").eq("business_id",business.id).order("created_at",{ascending:false}),
    ]);
    setAgents((a.data??[]) as Agent[]); setTools((t.data??[]) as Tool[]); setHandoffs((h.data??[]) as Handoff[]); setDeployments((d.data??[]) as Deployment[]);
    if (!agentId && a.data?.[0]) setAgentId(a.data[0].id);
  };
  useEffect(()=>{ void load(); },[business]);

  const addTool = async () => {
    if (!business || !agentId || !name.trim() || busy) return;
    setBusy(true);
    const { data } = await supabase.from("ai_agent_tools").insert({
      business_id: business.id, agent_id: agentId, name: name.trim(), description: "BOOKORA business tool",
      tool_type: "custom", config: {}, approval_required: true, enabled: true,
    }).select("id,agent_id,name,tool_type,approval_required,enabled").single();
    if (data) { setTools(x=>[data as Tool,...x]); setName(""); }
    setBusy(false);
  };

  const createHandoff = async () => {
    if (!business || !agentId || busy) return;
    setBusy(true);
    const { data } = await supabase.from("ai_agent_handoffs").insert({
      business_id: business.id, agent_id: agentId, reason: "Human review requested from Agent Operations",
      status: "pending", assigned_to: membership?.user_id ?? null,
    }).select("id,agent_id,reason,status,notes").single();
    if (data) setHandoffs(x=>[data as Handoff,...x]);
    setBusy(false);
  };

  const deploy = async (channel: "dashboard"|"public_web"|"embed"|"api"|"workflow") => {
    if (!business || !agentId || busy) return;
    setBusy(true);
    const { data } = await supabase.from("ai_agent_deployments").insert({
      business_id: business.id, agent_id: agentId, channel, enabled: channel === "dashboard", settings: {},
    }).select("id,agent_id,channel,public_key,enabled").single();
    if (data) setDeployments(x=>[data as Deployment,...x]);
    setBusy(false);
  };

  return <PlanGate minimumPlan="pro" featureName="AI Agent Operations">
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="card p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="text-primary-600"/><div><h1 className="text-2xl font-bold">AI Agent Operations</h1><p className="text-sm text-gray-500">Tools, approvals, human handoff and deployment controls for production agents.</p></div></div>
      </section>
      <section className="card p-5">
        <label className="text-sm font-medium">Active agent</label>
        <select className="input mt-2" value={agentId} onChange={e=>setAgentId(e.target.value)}>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2"><Wrench size={18}/><h2 className="font-semibold">Agent tools</h2></div>
          <p className="mt-1 text-xs text-gray-500">Every new custom tool starts approval-required.</p>
          <div className="mt-4 flex gap-2"><input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Tool name"/><button className="btn-primary" onClick={()=>void addTool()} disabled={busy||!name.trim()}><Plus size={15}/>Add</button></div>
          <div className="mt-4 space-y-2">{tools.filter(t=>t.agent_id===agentId).map(t=><div key={t.id} className="flex items-center justify-between rounded-xl border p-3 dark:border-gray-800"><span className="text-sm">{t.name}</span><span className="text-xs text-gray-500">{t.approval_required?"Approval required":"Auto"}</span></div>)}</div>
        </section>
        <section className="card p-5">
          <div className="flex items-center gap-2"><Hand size={18}/><h2 className="font-semibold">Human handoff</h2></div>
          <p className="mt-1 text-xs text-gray-500">Create a review queue item when an agent needs a person.</p>
          <button className="btn-primary mt-4" onClick={()=>void createHandoff()} disabled={busy||!agentId}><Hand size={15}/>Request human review</button>
          <div className="mt-4 space-y-2">{handoffs.filter(h=>h.agent_id===agentId).slice(0,8).map(h=><div key={h.id} className="rounded-xl border p-3 dark:border-gray-800"><div className="flex justify-between text-sm"><span>{h.reason}</span><span className="capitalize text-gray-500">{h.status}</span></div></div>)}</div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2"><CalendarClock size={18}/><h2 className="font-semibold">Deployment channels</h2></div>
          <div className="mt-4 flex flex-wrap gap-2">{(["dashboard","public_web","embed","api","workflow"] as const).map(c=><button key={c} className="btn-secondary" onClick={()=>void deploy(c)} disabled={busy||!agentId}><CheckCircle2 size={14}/>{c.replace("_"," ")}</button>)}</div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{deployments.filter(d=>d.agent_id===agentId).map(d=><div key={d.id} className="rounded-xl border p-3 dark:border-gray-800"><div className="flex justify-between text-sm"><span className="capitalize">{d.channel.replace("_"," ")}</span><span>{d.enabled?"Enabled":"Configured"}</span></div>{d.public_key&&<code className="text-[10px] text-gray-500">{d.public_key}</code>}</div>)}</div>
        </section>
      </div>
    </div>
  </PlanGate>;
}

export const AgentOperationsRoute = createFileRoute("/ai-agent-operations")({
  ssr: false,
  component: () => <Protected><AIAgentOperations/></Protected>,
});
