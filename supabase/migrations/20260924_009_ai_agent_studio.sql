-- BOOKORA AI Agent Studio: persistent business agents, memory, chat, runs, and multimodal jobs.
-- Feature catalog is based only on public product documentation and common business patterns.
create extension if not exists pgcrypto;

create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  role text not null default 'business_assistant',
  system_prompt text not null default '',
  model text,
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  config jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '[]'::jsonb,
  starter_prompts jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agent_memories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  memory_type text not null check (memory_type in ('fact','event','instruction','task','preference')),
  content text not null,
  source text not null default 'conversation',
  confidence numeric(4,3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  title text,
  summary text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  tool_calls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  job_type text not null check (job_type in ('app','website','software','document','image','video','voice','audio','research','automation')),
  prompt text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists ai_agents_business_idx on public.ai_agents(business_id,status);
create index if not exists ai_agent_memories_agent_idx on public.ai_agent_memories(agent_id,created_at desc);
create index if not exists ai_conversations_agent_idx on public.ai_conversations(agent_id,updated_at desc);
create index if not exists ai_messages_conversation_idx on public.ai_messages(conversation_id,created_at);
create index if not exists ai_generation_jobs_business_idx on public.ai_generation_jobs(business_id,created_at desc);

alter table public.ai_agents enable row level security;
alter table public.ai_agent_memories enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_generation_jobs enable row level security;

grant select,insert,update,delete on public.ai_agents to authenticated;
grant select,insert,update,delete on public.ai_agent_memories to authenticated;
grant select,insert,update,delete on public.ai_conversations to authenticated;
grant select,insert,update,delete on public.ai_messages to authenticated;
grant select,insert,update,delete on public.ai_generation_jobs to authenticated;

drop policy if exists ai_agents_member on public.ai_agents;
create policy ai_agents_member on public.ai_agents for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_memories_member on public.ai_agent_memories;
create policy ai_agent_memories_member on public.ai_agent_memories for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_conversations_member on public.ai_conversations;
create policy ai_conversations_member on public.ai_conversations for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_messages_member on public.ai_messages;
create policy ai_messages_member on public.ai_messages for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_generation_jobs_member on public.ai_generation_jobs;
create policy ai_generation_jobs_member on public.ai_generation_jobs for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create or replace function public.ai_agent_starter_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object('name','Business Copilot','role','business_assistant','capabilities',jsonb_build_array('business_qa','analytics','memory','knowledge')),
    jsonb_build_object('name','Sales Agent','role','sales','capabilities',jsonb_build_array('lead_qualification','crm','follow_up','memory')),
    jsonb_build_object('name','Support Agent','role','support','capabilities',jsonb_build_array('faq','handoff','tickets','knowledge')),
    jsonb_build_object('name','Booking Agent','role','booking','capabilities',jsonb_build_array('availability','booking','reschedule','memory')),
    jsonb_build_object('name','Marketing Agent','role','marketing','capabilities',jsonb_build_array('campaigns','copy','segmentation','analytics')),
    jsonb_build_object('name','Research Agent','role','research','capabilities',jsonb_build_array('research','summaries','citations')),
    jsonb_build_object('name','Content Agent','role','content','capabilities',jsonb_build_array('copy','documents','social')),
    jsonb_build_object('name','Website Builder Agent','role','website_builder','capabilities',jsonb_build_array('website','ui','code')),
    jsonb_build_object('name','App Builder Agent','role','app_builder','capabilities',jsonb_build_array('app','ui','code','database')),
    jsonb_build_object('name','Software Engineer Agent','role','software','capabilities',jsonb_build_array('code','debugging','testing','documentation')),
    jsonb_build_object('name','Data Analyst Agent','role','analytics','capabilities',jsonb_build_array('analytics','reports','charts')),
    jsonb_build_object('name','Finance Assistant','role','finance','capabilities',jsonb_build_array('payments','revenue','reports')),
    jsonb_build_object('name','Operations Agent','role','operations','capabilities',jsonb_build_array('tasks','inventory','automation')),
    jsonb_build_object('name','Inventory Agent','role','inventory','capabilities',jsonb_build_array('stock','reorder','movements')),
    jsonb_build_object('name','HR Assistant','role','hr','capabilities',jsonb_build_array('staff','policies','tasks')),
    jsonb_build_object('name','Executive Assistant','role','executive','capabilities',jsonb_build_array('planning','summaries','tasks','memory')),
    jsonb_build_object('name','Document Agent','role','documents','capabilities',jsonb_build_array('documents','summaries','extraction')),
    jsonb_build_object('name','Image Creative Agent','role','image','capabilities',jsonb_build_array('image','branding','creative')),
    jsonb_build_object('name','Video Creative Agent','role','video','capabilities',jsonb_build_array('video','storyboard','creative')),
    jsonb_build_object('name','Voice Agent','role','voice','capabilities',jsonb_build_array('voice','transcription','script')),
    jsonb_build_object('name','Automation Agent','role','automation','capabilities',jsonb_build_array('workflows','webhooks','scheduled_runs')),
    jsonb_build_object('name','QA Agent','role','qa','capabilities',jsonb_build_array('testing','validation','regression')),
    jsonb_build_object('name','Product Manager Agent','role','product','capabilities',jsonb_build_array('requirements','roadmaps','priorities')),
    jsonb_build_object('name','Customer Success Agent','role','customer_success','capabilities',jsonb_build_array('customers','retention','follow_up'))
  );
$$;
