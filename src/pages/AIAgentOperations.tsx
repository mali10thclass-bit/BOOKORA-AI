import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Hand, Plus, ShieldCheck, Wrench, FlaskConical, Rocket } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";
import { Protected } from "@/components/Protected";
import { runAgentEvaluation } from "@/lib/assistant.functions";

type Agent = { id: string; name: string };
type Tool = { id: string; agent_id: string; name: string; tool_type: string; approval_required: boolean; enabled: boolean };
type Handoff = { id: string; agent_id: string; reason: string; status: string; notes: string | null };
type Deployment = { id: string; agent_id: string; channel: string; public_key: string | null; enabled: boolean };
type EvolutionRun = { id: string; status: string; trigger: string; sources_scanned: number; models_discovered: number; candidates_created: number; summary: string | null; created_at: string };
type Candidate = { id: string; title: string; improvement_type: string; risk_level: string; regression_passed: boolean; approval_status: string };
type EvalRun = { id: string; status: string; case_count: number; passed_count: number; score: number | null; summary: string | null; created_at: string };

export function AIAgentOperations() {
  const { business, membership } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [evolutionRuns, setEvolutionRuns] = useState<EvolutionRun[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([]);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [evalInput, setEvalInput] = useState("");
  const [evalExpected, setEvalExpected] = useState("");
  const [busy, setBusy] = useState(false);
  const [evolutionBusy, setEvolutionBusy] = useState(false);
  const [evaluationBusy, setEvaluationBusy] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);

  const load = async () => {
    if (!business) return;
    const [a,t,h,d,e,c,er] = await Promise.all([
      supabase.from("ai_agents").select("id,name").eq("business_id", business.id).neq("status","archived").order("name"),
      supabase.from("ai_agent_tools").select("id,agent_id,name,tool_type,approval_required,enabled").eq("business_id",business.id).order("created_at",{ascending:false}),
      supabase.from("ai_agent_handoffs").select("id,agent_id,reason,status,notes").eq("business_id",business.id).order("created_at",{ascending:false}).limit(30),
      supabase.from("ai_agent_deployments").select("id,agent_id,channel,public_key,enabled").eq("business_id",business.id).order("created_at",{ascending:false}),
      supabase.from("ai_evolution_runs").select("id,status,trigger,sources_scanned,models_discovered,candidates_created,summary,created_at").eq("business_id",business.id).order("created_at",{ascending:false}).limit(10),
      supabase.from("ai_improvement_candidates").select("id,title,improvement_type,risk_level,regression_passed,approval_status").eq("business_id",business.id).order("created_at",{ascending:false}).limit(20),
      supabase.from("ai_agent_eval_runs").select("id,status,case_count,passed_count,score,summary,created_at").eq("business_id",business.id).order("created_at",{ascending:false}).limit(10),
    ]);
    setAgents((a.data??[]) as Agent[]); setTools((t.data??[]) as Tool[]); setHandoffs((h.data??[]) as Handoff[]);
    setDeployments((d.data??[]) as Deployment[]); setEvolutionRuns((e.data??[]) as EvolutionRun[]);
    setCandidates((c.data??[]) as Candidate[]); setEvalRuns((er.data??[]) as EvalRun[]);
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

  const runTool = async (toolId: string, input: Record<string, unknown>) => {
    if (!business || busy) return;
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
      const response = await fetch(base + "/functions/v1/ai-agent-tool-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session.session?.access_token ? { Authorization: "Bearer " + session.session.access_token } : {}) },
        body: JSON.stringify({ toolId, input }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) console.error("[agent-tool]", payload.error);
    } finally { setBusy(false); }
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

  const enableDailyEvolution = async () => {
    if (!business || !agentId || scheduleBusy) return;
    setScheduleBusy(true);
    try {
      const next = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("ai_agent_schedules").insert({
        business_id: business.id, agent_id: agentId, name: "Daily AI evolution", cron: "daily",
        prompt: "Review public AI/model updates and create evidence-backed improvement candidates.",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        enabled: true, interval_minutes: 1440, next_run_at: next,
      });
    } finally {
      setScheduleBusy(false);
      await load();
    }
  };

  const runEvolution = async () => {
    if (!business || evolutionBusy) return;
    setEvolutionBusy(true);
    try {
      await supabase.from("ai_evolution_runs").insert({ business_id: business.id, agent_id: agentId || null, status:"queued", trigger:"manual" });
      await load();
    } finally { setEvolutionBusy(false); }
  };

  const addEvalCase = async () => {
    if (!business || !agentId || !evalInput.trim() || !evalExpected.trim()) return;
    await supabase.from("ai_agent_eval_cases").insert({
      business_id: business.id, agent_id: agentId, name: "Manual evaluation case",
      input: evalInput.trim(), expected_criteria: { contains_any: [evalExpected.trim()] }, enabled: true,
    });
    setEvalInput(""); setEvalExpected("");
  };

  const runEvaluation = async () => {
    if (!business || !agentId || evaluationBusy) return;
    setEvaluationBusy(true);
    try {
      const { data: run, error } = await supabase.from("ai_agent_eval_runs").insert({
        business_id: business.id, agent_id: agentId, status:"queued",
      }).select("id").single();
      if (error || !run) return;
      await runAgentEvaluation({ data: { agentId, runId: run.id } });
      await load();
    } finally { setEvaluationBusy(false); }
  };

  const reviewCandidate = async (id: string, status: "approved"|"rejected") => {
    await supabase.from("ai_improvement_candidates").update({ approval_status: status, reviewed_at: new Date().toISOString() }).eq("id", id).eq("business_id", business?.id ?? "");
    await load();
  };

  const promoteCandidate = async (id: string) => {
    if (!business) return;
    const { error } = await supabase.rpc("promote_ai_improvement_candidate", { p_candidate_id:id });
    if (!error) await load();
  };

  const deploy = async (channel: "dashboard"|"public_web"|"embed"|"api"|"workflow") => {
    if (!business || !agentId || busy) return;
    setBusy(true);
    try {
      if (channel === "public_web" || channel === "embed") {
        const { data, error } = await supabase.rpc("create_public_ai_deployment", {
          p_business_id: business.id, p_agent_id: agentId, p_channel: channel, p_allowed_origins: [],
        });
        if (!error && data) {
          const payload = data as { deployment_id: string; public_key: string; public_key_prefix: string };
          setDeployments(x => [{ id: payload.deployment_id, agent_id: agentId, channel, public_key: payload.public_key_prefix, enabled: true }, ...x]);
          window.prompt("Copy this public deployment key now. It is only returned once.", payload.public_key);
        }
      } else {
        const { data } = await supabase.from("ai_agent_deployments").insert({
          business_id: business.id, agent_id: agentId, channel, enabled: channel === "dashboard", settings: {},
        }).select("id,agent_id,channel,public_key,enabled").single();
        if (data) setDeployments(x=>[data as Deployment,...x]);
      }
      await load();
    } finally { setBusy(false); }
  };

  return <PlanGate minimumPlan="pro" featureName="AI Agent Operations">
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="card p-6">
        <div className="flex items-center gap-3"><ShieldCheck className="text-primary-600"/><div><h1 className="text-2xl font-bold">AI Agent Operations</h1><p className="text-sm text-gray-500">Tools, approvals, evaluation, human handoff and deployment controls for production agents.</p></div></div>
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
          <div className="mt-4 space-y-2">{tools.filter(t=>t.agent_id===agentId).map(t=><div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 dark:border-gray-800"><div><span className="text-sm">{t.name}</span><p className="text-xs text-gray-500">{t.tool_type} · {t.approval_required?"Approval required":"Auto"}</p></div><button className="btn-secondary" disabled={busy} onClick={()=>void runTool(t.id, t.tool_type==="knowledge"?{query:"What services and policies are available?"}:t.tool_type==="analytics"?{question:"Summarize current business status"}:{title:"Follow up on an AI-generated task"})}>Test</button></div>)}</div>
        </section>
        <section className="card p-5">
          <div className="flex items-center gap-2"><Hand size={18}/><h2 className="font-semibold">Human handoff</h2></div>
          <p className="mt-1 text-xs text-gray-500">Create a review queue item when an agent needs a person.</p>
          <button className="btn-primary mt-4" onClick={()=>void createHandoff()} disabled={busy||!agentId}><Hand size={15}/>Request human review</button>
          <div className="mt-4 space-y-2">{handoffs.filter(h=>h.agent_id===agentId).slice(0,8).map(h=><div key={h.id} className="rounded-xl border p-3 dark:border-gray-800"><div className="flex justify-between text-sm"><span>{h.reason}</span><span className="capitalize text-gray-500">{h.status}</span></div></div>)}</div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2"><FlaskConical size={18}/><h2 className="font-semibold">Agent evaluation</h2></div>
          <p className="mt-1 text-xs text-gray-500">Deterministic criteria only: results are evidence for regression decisions, not proof of general AI quality.</p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <input className="input" value={evalInput} onChange={e=>setEvalInput(e.target.value)} placeholder="Test question"/>
            <input className="input" value={evalExpected} onChange={e=>setEvalExpected(e.target.value)} placeholder="Expected phrase"/>
          </div>
          <div className="mt-3 flex gap-2"><button className="btn-secondary" onClick={()=>void addEvalCase()} disabled={!evalInput.trim()||!evalExpected.trim()}><Plus size={14}/>Add case</button><button className="btn-primary" onClick={()=>void runEvaluation()} disabled={evaluationBusy||!agentId}><FlaskConical size={14}/>{evaluationBusy?"Running...":"Run evaluation"}</button></div>
          <div className="mt-4 space-y-2">{evalRuns.filter(r=>r.status==="completed").slice(0,5).map(r=><div key={r.id} className="rounded-xl border p-3 dark:border-gray-800"><div className="flex justify-between text-sm"><span>{r.passed_count}/{r.case_count} passed</span><span>{r.score===null?"—":Number(r.score).toFixed(2)}</span></div><p className="mt-1 text-xs text-gray-500">{r.summary}</p></div>)}</div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Continuous AI evolution</h2><p className="text-xs text-gray-500">Discover public AI updates, record evidence, evaluate and promote only reviewed changes.</p></div><button className="btn-primary" onClick={()=>void runEvolution()} disabled={evolutionBusy||!agentId}><Rocket size={14}/>{evolutionBusy?"Queued...":"Run trainer"}</button></div>
          <div className="mt-4 flex gap-2"><button className="btn-secondary" onClick={()=>void enableDailyEvolution()} disabled={scheduleBusy||!agentId}><CalendarClock size={14}/>{scheduleBusy?"Enabling...":"Enable daily evolution"}</button></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{evolutionRuns.slice(0,6).map(r=><div key={r.id} className="rounded-xl border p-3 dark:border-gray-800"><div className="flex justify-between text-sm"><span>{r.trigger} · {r.status}</span><span>{r.candidates_created} candidates</span></div><p className="mt-1 text-xs text-gray-500">{r.summary}</p></div>)}</div>
          <div className="mt-4 space-y-2">{candidates.filter(c=>c.approval_status!=="rejected").slice(0,8).map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 dark:border-gray-800"><div><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-gray-500">{c.improvement_type} · {c.risk_level} · {c.approval_status}</p></div><div className="flex gap-2">{c.approval_status==="pending"&&<><button className="btn-secondary" onClick={()=>void reviewCandidate(c.id,"rejected")}>Reject</button><button className="btn-primary" onClick={()=>void reviewCandidate(c.id,"approved")}>Approve</button></>}{c.approval_status==="approved"&&c.regression_passed&&<button className="btn-primary" onClick={()=>void promoteCandidate(c.id)}>Promote</button>}</div></div>)}</div>
        </section>
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2"><CalendarClock size={18}/><h2 className="font-semibold">Deployment channels</h2></div>
          <div className="mt-4 flex flex-wrap gap-2">{(["dashboard","public_web","embed","api","workflow"] as const).map(c=><button key={c} className="btn-secondary" onClick={()=>void deploy(c)} disabled={busy||!agentId}><CheckCircle2 size={14}/>{c.replace("_"," ")}</button>)}</div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{deployments.filter(d=>d.agent_id===agentId).map(d=><div key={d.id} className="rounded-xl border p-3 dark:border-gray-800"><div className="flex justify-between text-sm"><span className="capitalize">{d.channel.replace("_"," ")}</span><span>{d.enabled?"Enabled":"Configured"}</span></div>{d.public_key&&<code className="text-[10px] text-gray-500">{d.public_key}</code>}{(d.channel==="public_web"||d.channel==="embed")&&d.public_key&&<button className="ml-2 text-xs text-primary-600" onClick={()=>navigator.clipboard?.writeText(window.location.origin+"/ai-chat/"+d.public_key)}>Copy chat URL</button>}</div>)}</div>
        </section>
      </div>
    </div>
  </PlanGate>;
}

export const AgentOperationsRoute = createFileRoute("/ai-agent-operations")({
  ssr: false,
  component: () => <Protected><AIAgentOperations/></Protected>,
});
