-- BOOKORA AI: secure public AI deployment, public chatbot controls, tool execution audit and knowledge refresh queue.

alter table public.ai_agent_deployments
  add column if not exists public_key_hash text,
  add column if not exists public_key_prefix text,
  add column if not exists rate_limit_per_minute integer not null default 30 check (rate_limit_per_minute between 1 and 300),
  add column if not exists allowed_origins text[] not null default '{}',
  add column if not exists public_system_prompt text,
  add column if not exists last_used_at timestamptz;

create unique index if not exists ai_agent_deployments_public_key_hash_idx
  on public.ai_agent_deployments(public_key_hash)
  where public_key_hash is not null;

create table if not exists public.ai_agent_tool_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  tool_id uuid not null references public.ai_agent_tools(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'agent',
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  status text not null default 'completed' check (status in ('proposed','approved','completed','failed','rejected')),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_knowledge_refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_id uuid not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  reason text not null default 'source_changed',
  content_digest text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists ai_agent_tool_runs_business_idx on public.ai_agent_tool_runs(business_id, created_at desc);
create index if not exists ai_knowledge_refresh_jobs_status_idx on public.ai_knowledge_refresh_jobs(status, created_at asc);

alter table public.ai_agent_tool_runs enable row level security;
alter table public.ai_knowledge_refresh_jobs enable row level security;

grant select on public.ai_agent_tool_runs to authenticated;
grant select,insert on public.ai_knowledge_refresh_jobs to authenticated;

create policy ai_agent_tool_runs_member on public.ai_agent_tool_runs for select to authenticated
using (public.is_business_member(business_id));

create policy ai_knowledge_refresh_jobs_member on public.ai_knowledge_refresh_jobs for select to authenticated
using (public.is_business_member(business_id));

create or replace function public.create_public_ai_deployment(
  p_business_id uuid,
  p_agent_id uuid,
  p_channel text default 'public_web',
  p_allowed_origins text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  raw_key text;
  deployment_id uuid;
begin
  if not public.is_business_member(p_business_id) then raise exception 'not authorized'; end if;
  if not public.bookora_plan_allows_feature(p_business_id,'public_ai_chat') then raise exception 'Public AI Chat requires Ultimate or Enterprise'; end if;
  if p_channel not in ('public_web','embed') then raise exception 'invalid public channel'; end if;
  if not exists (select 1 from public.ai_agents where id=p_agent_id and business_id=p_business_id and status='active') then
    raise exception 'agent not found';
  end if;

  raw_key := 'bok_pub_' || encode(gen_random_bytes(24),'hex');

  insert into public.ai_agent_deployments(
    business_id,agent_id,channel,public_key,public_key_hash,public_key_prefix,allowed_origins,enabled
  )
  values (
    p_business_id,p_agent_id,p_channel,null,
    encode(digest(raw_key,'sha256'),'hex'),
    left(raw_key,16),
    coalesce(p_allowed_origins,'{}'),true
  )
  returning id into deployment_id;

  return jsonb_build_object(
    'deployment_id',deployment_id,
    'public_key',raw_key,
    'public_key_prefix',left(raw_key,16)
  );
end;
$$;

revoke all on function public.create_public_ai_deployment(uuid,uuid,text,text[]) from public;
grant execute on function public.create_public_ai_deployment(uuid,uuid,text,text[]) to authenticated;

create or replace function public.rotate_public_ai_deployment_key(p_deployment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  d public.ai_agent_deployments%rowtype;
  raw_key text;
begin
  select * into d from public.ai_agent_deployments where id=p_deployment_id;
  if d.id is null or not public.is_business_member(d.business_id) then raise exception 'not authorized'; end if;
  raw_key := 'bok_pub_' || encode(gen_random_bytes(24),'hex');
  update public.ai_agent_deployments
    set public_key=null,
        public_key_hash=encode(digest(raw_key,'sha256'),'hex'),
        public_key_prefix=left(raw_key,16),
        updated_at=now()
  where id=d.id;
  return jsonb_build_object('deployment_id',d.id,'public_key',raw_key,'public_key_prefix',left(raw_key,16));
end;
$$;

revoke all on function public.rotate_public_ai_deployment_key(uuid) from public;
grant execute on function public.rotate_public_ai_deployment_key(uuid) to authenticated;

create or replace function public.enqueue_ai_knowledge_refresh(
  p_business_id uuid,
  p_source_id uuid,
  p_reason text default 'source_changed'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare jid uuid;
begin
  if not public.is_business_member(p_business_id) then raise exception 'not authorized'; end if;
  insert into public.ai_knowledge_refresh_jobs(business_id,source_id,reason)
  values(p_business_id,p_source_id,p_reason)
  returning id into jid;
  return jid;
end;
$$;

revoke all on function public.enqueue_ai_knowledge_refresh(uuid,uuid,text) from public;
grant execute on function public.enqueue_ai_knowledge_refresh(uuid,uuid,text) to authenticated;
