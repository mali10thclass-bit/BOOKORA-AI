import { useEffect, useMemo, useState } from "react";
import { Bot, BrainCircuit, Code2, Image, Mic, Play, Plus, Search, Send, Sparkles, Trash2, Video, WandSparkles, Globe2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlanGate } from "@/components/PlanGate";
import { askBusinessAssistant } from "@/lib/assistant.functions";

type Agent = { id: string; name: string; description: string | null; role: string; status: string; capabilities: unknown; starter_prompts: unknown };
type Message = { id: string; role: string; content: string; created_at: string };
type Template = { name: string; role: string; icon: typeof Bot; description: string; capabilities: string[] };

const templates: Template[] = [
  ["Business Copilot","business_assistant",Bot,"Company-aware answers, analytics, knowledge and memory",["Q&A","analytics","memory"]],
  ["Sales Agent","sales",Sparkles,"Lead qualification, CRM follow-up and sales preparation",["CRM","leads","follow-up"]],
  ["Support Agent","support",Bot,"Grounded FAQ support, ticket capture and human handoff",["FAQ","tickets","handoff"]],
  ["Booking Agent","booking",Globe2,"Availability, booking, rescheduling and reminders",["booking","availability","calendar"]],
  ["Marketing Agent","marketing",WandSparkles,"Campaign planning, segmentation and marketing copy",["campaigns","copy","segments"]],
  ["Research Agent","research",Search,"Business research with source-aware summaries",["research","citations","summaries"]],
  ["Content Agent","content",WandSparkles,"Blogs, social posts, product copy and documents",["copy","documents","social"]],
  ["Website Builder","website_builder",Globe2,"Generate website plans, UI specifications and implementation tasks",["website","UI","code"]],
  ["App Builder","app_builder",Code2,"Turn requirements into app architecture, screens and implementation plans",["app","UI","database"]],
  ["Software Engineer","software",Code2,"Code generation, debugging, tests and technical documentation",["code","tests","debug"]],
  ["Data Analyst","analytics",Search,"Metrics, reports, trends and chart specifications",["analytics","reports","charts"]],
  ["Finance Assistant","finance",Sparkles,"Revenue, payments, outstanding balances and finance summaries",["payments","revenue","reports"]],
  ["Operations Agent","operations",WandSparkles,"Tasks, inventory, workflows and operating procedures",["tasks","inventory","automation"]],
  ["Inventory Agent","inventory",Bot,"Stock monitoring, reorder signals and movement reasoning",["stock","reorder","ledger"]],
  ["HR Assistant","hr",Bot,"Staff workflows, policies, onboarding and internal tasks",["staff","policies","tasks"]],
  ["Executive Assistant","executive",Sparkles,"Planning, summaries, priorities and persistent context",["planning","memory","tasks"]],
  ["Document Agent","documents",WandSparkles,"Extract, summarize and transform business documents",["documents","extract","summarize"]],
  ["Image Creative","image",Image,"Image prompts, brand directions and creative briefs",["image","brand","creative"]],
  ["Video Creative","video",Video,"Video concepts, scripts, storyboards and production briefs",["video","script","storyboard"]],
  ["Voice Agent","voice",Mic,"Voice scripts, conversation design and speech workflows",["voice","transcription","script"]],
  ["Automation Agent","automation",WandSparkles,"Workflow design, triggers, actions and webhook plans",["workflows","webhooks","schedules"]],
  ["QA Agent","qa",Search,"Test planning, regression cases and release verification",["testing","QA","regression"]],
  ["Product Manager","product",Sparkles,"Requirements, roadmaps, acceptance criteria and prioritization",["PRD","roadmap","requirements"]],
  ["Customer Success","customer_success",Bot,"Retention, follow-up, customer health and service recovery",["customers","retention","follow-up"]],
];

export function AIAgentStudio() {
  const { business, membership } = useAuth();
  const ask = useServerFn(askBusinessAssistant);
  const [agents,setAgents]=useState<Agent[]>([]);
  const [agent,setAgent]=useState<Agent|null>(null);
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [memories,setMemories]=useState<{id:string;memory_type:string;content:string}[]>([]);
  const [prompt,setPrompt]=useState("");
  const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState<"chat"|"agents"|"memory"|"build">("chat");
  const [search,setSearch]=useState("");

  const loadAgents=async()=>{
    if(!business) return;
    const {data}=await supabase.from("ai_agents").select("id,name,description,role,status,capabilities,starter_prompts").eq("business_id",business.id).neq("status","archived").order("created_at",{ascending:false});
    const list=(data??[]) as Agent[];
    setAgents(list);
    if(!agent && list[0]) setAgent(list[0]);
  };
  useEffect(()=>{void loadAgents();},[business]);
  useEffect(()=>{ if(agent) void openConversation(agent); },[agent?.id]);

  const openConversation=async(a:Agent)=>{
    if(!business) return;
    const {data}=await supabase.from("ai_conversations").select("id").eq("business_id",business.id).eq("agent_id",a.id).eq("status","active").order("updated_at",{ascending:false}).limit(1).maybeSingle();
    let id=data?.id??null;
    if(!id){
      const created=await supabase.from("ai_conversations").insert({business_id:business.id,agent_id:a.id,user_id:membership?.user_id??null,title:a.name}).select("id").single();
      id=created.data?.id??null;
    }
    setConversationId(id);
    if(id){
      const [m,mem]=await Promise.all([
        supabase.from("ai_messages").select("id,role,content,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(100),
        supabase.from("ai_agent_memories").select("id,memory_type,content").eq("agent_id",a.id).order("created_at",{ascending:false}).limit(50),
      ]);
      setMessages((m.data??[]) as Message[]); setMemories((mem.data??[]) as typeof memories);
    }
  };

  const send=async()=>{
    if(!business||!agent||!conversationId||!prompt.trim()||busy) return;
    const text=prompt.trim(); setPrompt(""); setBusy(true);
    await supabase.from("ai_messages").insert({conversation_id:conversationId,business_id:business.id,role:"user",content:text});
    setMessages(x=>[...x,{id:crypto.randomUUID(),role:"user",content:text,created_at:new Date().toISOString()}]);
    try{
      const result=await ask({data:{question:text,language:"en",conversationId,agentId:agent.id}});
      const answer=result.answer??result.error??"I could not produce a grounded answer.";
      await supabase.from("ai_messages").insert({conversation_id:conversationId,business_id:business.id,role:"assistant",content:answer});
      setMessages(x=>[...x,{id:crypto.randomUUID(),role:"assistant",content:answer,created_at:new Date().toISOString()}]);
    } finally { setBusy(false); }
  };

  const createFromTemplate=async(t:Template)=>{
    if(!business) return;
    const {data}=await supabase.from("ai_agents").insert({
      business_id:business.id,name:t.name,description:t.description,role:t.role,status:"active",
      system_prompt:`You are the BOOKORA ${t.name}. Use the business knowledge, approved tools and business data available to you. Never invent business facts; state uncertainty and request missing information.`,
      capabilities:t.capabilities,starter_prompts:[`What can you do for my business as a ${t.name}?`,`Give me today's most important actions.`],
      created_by:membership?.user_id??null,
    }).select("id,name,description,role,status,capabilities,starter_prompts").single();
    if(data){setAgents(x=>[data as Agent,...x]);setAgent(data as Agent);setTab("chat");}
  };

  const addMemory=async()=>{
    if(!business||!agent||!prompt.trim()) return;
    const content=prompt.trim(); setPrompt("");
    const {data}=await supabase.from("ai_agent_memories").insert({business_id:business.id,agent_id:agent.id,memory_type:"instruction",content,source:"user"}).select("id,memory_type,content").single();
    if(data) setMemories(x=>[data as typeof memories[0],...x]);
  };

  const createJob=async(type:"app"|"website"|"software"|"document"|"image"|"video"|"voice")=>{
    if(!business) return;
    const p=prompt.trim()||`Create a production-ready ${type} concept for my business using our brand, services and business context.`;
    const {error}=await supabase.from("ai_generation_jobs").insert({business_id:business.id,agent_id:agent?.id??null,user_id:membership?.user_id??null,job_type:type,prompt:p});
    if(!error){setPrompt("");alert(`${type} generation job queued. Connect the approved generation provider/worker to produce the final artifact.`);}
  };

  const filtered=useMemo(()=>templates.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())||t.role.includes(search.toLowerCase())),[search]);

  if(!business) return null;
  return <PlanGate minimumPlan="pro" featureName="AI Agent Studio">
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs"><BrainCircuit size={14}/> AI AGENT STUDIO</div>
            <h1 className="text-3xl font-bold">One business brain. Many specialized agents.</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-400">Persistent conversations, business knowledge, agent templates, memory and a single workspace for planning multimodal work.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm"><b>{agents.length}</b> custom agents · <b>{memories.length}</b> memories</div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["chat","agents","memory","build"] as const).map(x=><button key={x} onClick={()=>setTab(x)} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab===x?"bg-primary-600 text-white":"bg-gray-100 dark:bg-gray-800"}`}>{x==="chat"?"Chat":x==="agents"?"Agent Library":x==="memory"?"Memory":"Build Studio"}</button>)}
      </div>

      {tab==="chat" && <div className="grid min-h-[620px] gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="card overflow-hidden"><div className="border-b p-4 dark:border-gray-800"><p className="text-sm font-semibold">Agents</p></div>
          <div className="max-h-[560px] overflow-y-auto p-2">{agents.length===0?<p className="p-4 text-xs text-gray-500">Create an agent from Agent Library.</p>:agents.map(a=><button key={a.id} onClick={()=>setAgent(a)} className={`w-full rounded-xl p-3 text-left ${agent?.id===a.id?"bg-primary-50 text-primary-700 dark:bg-primary-950/30":"hover:bg-gray-50 dark:hover:bg-gray-800"}`}><div className="flex items-center gap-2"><Bot size={16}/><span className="truncate text-sm font-medium">{a.name}</span></div><p className="mt-1 truncate text-[11px] text-gray-500">{a.role}</p></button>)}</div>
        </aside>
        <section className="card flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b p-4 dark:border-gray-800"><div className="rounded-xl bg-primary-100 p-2 text-primary-700 dark:bg-primary-950/30"><Bot size={18}/></div><div><p className="font-semibold">{agent?.name??"No agent selected"}</p><p className="text-xs text-gray-500">Grounded in BOOKORA business context + approved knowledge</p></div></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.length===0?<div className="flex h-full min-h-80 items-center justify-center text-center text-sm text-gray-500"><div><Sparkles className="mx-auto mb-2"/><p>Ask one question. The agent will use your business context.</p></div></div>:messages.map(m=><div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role==="user"?"ml-auto bg-primary-600 text-white":"bg-gray-100 dark:bg-gray-800"}`}>{m.content}</div>)}</div>
          <div className="border-t p-4 dark:border-gray-800"><div className="flex gap-2"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} className="input min-h-12 flex-1" placeholder="Ask anything about your business..." /><button onClick={()=>void send()} disabled={busy||!agent} className="btn-primary self-end"><Send size={16}/>{busy?"Thinking...":"Send"}</button></div></div>
        </section>
      </div>}

      {tab==="agents" && <section className="space-y-4"><div className="flex gap-2"><input className="input" placeholder="Search agents..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(t=>{const Icon=t.icon;return <div key={t.name} className="card p-5"><div className="flex items-start justify-between"><div className="rounded-xl bg-primary-50 p-2.5 text-primary-700 dark:bg-primary-950/30"><Icon size={20}/></div><span className="text-xs text-gray-400">{t.role}</span></div><h3 className="mt-4 font-semibold">{t.name}</h3><p className="mt-1 text-sm text-gray-500">{t.description}</p><div className="mt-3 flex flex-wrap gap-1">{t.capabilities.map(c=><span key={c} className="rounded-full bg-gray-100 px-2 py-1 text-[10px] dark:bg-gray-800">{c}</span>)}</div><button onClick={()=>void createFromTemplate(t)} className="btn-primary mt-4 w-full justify-center"><Plus size={14}/> Create agent</button></div>})}</div></section>}

      {tab==="memory" && <section className="card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Persistent agent memory</h2><p className="text-xs text-gray-500">Store approved facts, preferences, instructions, events and tasks for the selected agent.</p></div><BrainCircuit size={20}/></div><div className="mt-5 space-y-2">{memories.map(m=><div key={m.id} className="flex gap-3 rounded-xl border p-3 dark:border-gray-800"><BrainCircuit size={16} className="mt-1 text-primary-600"/><div><span className="text-[10px] uppercase text-gray-400">{m.memory_type}</span><p className="text-sm">{m.content}</p></div></div>)}</div><div className="mt-5 flex gap-2"><input className="input" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Add a fact or instruction the agent should remember..."/><button className="btn-primary" onClick={()=>void addMemory()} disabled={!prompt.trim()||!agent}><BrainCircuit size={15}/> Remember</button></div></section>}

      {tab==="build" && <section className="space-y-4"><div className="card p-5"><h2 className="font-semibold">Multimodal Build Studio</h2><p className="mt-1 text-sm text-gray-500">Queue structured generation work. Final rendering requires the configured provider/worker; BOOKORA keeps the request, status and output metadata in one place.</p><textarea className="input mt-4 min-h-32" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Example: Build a modern booking website for my business with services, staff, FAQs and a contact flow."/></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{([["website",Globe2],["app",WandSparkles],["software",Code2],["document",WandSparkles],["image",Image],["video",Video],["voice",Mic]] as const).map(([type,Icon])=><button key={type} onClick={()=>void createJob(type)} className="card flex items-center gap-3 p-4 text-left hover:border-primary-400"><Icon size={20} className="text-primary-600"/><div><p className="font-medium capitalize">{type}</p><p className="text-xs text-gray-500">Queue generation</p></div></button>)}</div></section>}
    </div>
  </PlanGate>;
}
