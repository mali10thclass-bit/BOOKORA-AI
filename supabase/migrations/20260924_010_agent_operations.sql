-- BOOKORA AI Agent Operations: tools, schedules, human handoff, evaluation, and deployments.
-- Public feature patterns only; no proprietary implementation is copied.

create table if not exists public.ai_agent_tools (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  name text not null,
  description text,
  tool_type text not null check (tool_type in ('booking','crm','knowledge','analytics','automation','webhook','http','database','custom')),
  config jsonb not null default '{}'::jsonb,
  approval_required boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agent_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  name text not null,
  cron text not null,
  prompt text not null,
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agent_handoffs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','accepted','resolved','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.ai_agent_evaluations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  question text not null,
  answer text not null,
  grounded boolean not null default false,
  support_score numeric(5,4),
  citation_count integer not null default 0,
  evaluator text,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_agent_deployments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  channel text not null check (channel in ('dashboard','public_web','embed','api','workflow')),
  public_key text unique,
  settings jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_agent_tools_agent_idx on public.ai_agent_tools(agent_id, enabled);
create index if not exists ai_agent_schedules_agent_idx on public.ai_agent_schedules(agent_id, enabled);
create index if not exists ai_agent_handoffs_business_idx on public.ai_agent_handoffs(business_id, status, created_at desc);
create index if not exists ai_agent_evaluations_agent_idx on public.ai_agent_evaluations(agent_id, created_at desc);
create index if not exists ai_agent_deployments_agent_idx on public.ai_agent_deployments(agent_id, channel);

alter table public.ai_agent_tools enable row level security;
alter table public.ai_agent_schedules enable row level security;
alter table public.ai_agent_handoffs enable row level security;
alter table public.ai_agent_evaluations enable row level security;
alter table public.ai_agent_deployments enable row level security;

grant select,insert,update,delete on public.ai_agent_tools to authenticated;
grant select,insert,update,delete on public.ai_agent_schedules to authenticated;
grant select,insert,update,delete on public.ai_agent_handoffs to authenticated;
grant select,insert,update,delete on public.ai_agent_evaluations to authenticated;
grant select,insert,update,delete on public.ai_agent_deployments to authenticated;

drop policy if exists ai_agent_tools_member on public.ai_agent_tools;
create policy ai_agent_tools_member on public.ai_agent_tools for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_schedules_member on public.ai_agent_schedules;
create policy ai_agent_schedules_member on public.ai_agent_schedules for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_handoffs_member on public.ai_agent_handoffs;
create policy ai_agent_handoffs_member on public.ai_agent_handoffs for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_evaluations_member on public.ai_agent_evaluations;
create policy ai_agent_evaluations_member on public.ai_agent_evaluations for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_deployments_member on public.ai_agent_deployments;
create policy ai_agent_deployments_member on public.ai_agent_deployments for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
