-- BOOKORA AI: agent versioning, evaluation runs, scheduled evolution, promotion and rollback.
-- All mutations remain tenant-scoped and promotion is gated by regression_passed.

alter table public.ai_agent_schedules
  add column if not exists interval_minutes integer not null default 1440 check (interval_minutes >= 15),
  add column if not exists next_run_at timestamptz;

create table if not exists public.ai_agent_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  version_number integer not null,
  reason text not null default 'manual',
  system_prompt text,
  model text,
  config jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '{}'::jsonb,
  tool_registry jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(agent_id, version_number)
);

create table if not exists public.ai_agent_eval_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  case_count integer not null default 0,
  passed_count integer not null default 0,
  score numeric(6,4),
  summary text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_agent_eval_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_agent_eval_runs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  case_id uuid not null references public.ai_agent_eval_cases(id) on delete cascade,
  input text not null,
  output text,
  passed boolean not null default false,
  score numeric(6,4) not null default 0,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists ai_agent_versions_agent_idx on public.ai_agent_versions(agent_id, version_number desc);
create index if not exists ai_agent_eval_runs_agent_idx on public.ai_agent_eval_runs(agent_id, created_at desc);
create index if not exists ai_agent_eval_results_run_idx on public.ai_agent_eval_results(run_id);
create unique index if not exists ai_evolution_one_queued_per_agent_idx on public.ai_evolution_runs(business_id, agent_id) where status='queued' and agent_id is not null;

alter table public.ai_agent_versions enable row level security;
alter table public.ai_agent_eval_runs enable row level security;
alter table public.ai_agent_eval_results enable row level security;

grant select,insert on public.ai_agent_versions to authenticated;
grant select,insert,update on public.ai_agent_eval_runs to authenticated;
grant select,insert on public.ai_agent_eval_results to authenticated;

drop policy if exists ai_agent_versions_member on public.ai_agent_versions;
create policy ai_agent_versions_member on public.ai_agent_versions for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_eval_runs_member on public.ai_agent_eval_runs;
create policy ai_agent_eval_runs_member on public.ai_agent_eval_runs for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_agent_eval_results_member on public.ai_agent_eval_results;
create policy ai_agent_eval_results_member on public.ai_agent_eval_results for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create or replace function public.promote_ai_improvement_candidate(p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.ai_improvement_candidates%rowtype;
  a public.ai_agents%rowtype;
  next_version integer;
  runtime_model text;
begin
  select * into c from public.ai_improvement_candidates where id=p_candidate_id;
  if c.id is null or c.business_id is null or not public.is_business_member(c.business_id) then
    raise exception 'not authorized';
  end if;
  if c.approval_status <> 'approved' or c.regression_passed is not true then
    raise exception 'candidate is not promotion-ready';
  end if;

  select * into a from public.ai_agents where id=c.agent_id and business_id=c.business_id and status='active';
  if a.id is null then raise exception 'agent not found'; end if;

  select coalesce(max(version_number),0)+1 into next_version
  from public.ai_agent_versions where agent_id=a.id;

  insert into public.ai_agent_versions(
    business_id,agent_id,version_number,reason,system_prompt,model,config,capabilities,tool_registry,created_by
  ) values (
    a.business_id,a.id,next_version,'candidate:'||c.id,a.system_prompt,a.model,a.config,a.capabilities,
    coalesce((select jsonb_agg(to_jsonb(t)) from public.ai_agent_tools t where t.agent_id=a.id and t.enabled=true),'[]'::jsonb),
    auth.uid()
  );

  if c.improvement_type='model' then
    runtime_model := nullif(c.proposal->>'runtime_model','');
    if runtime_model is null then raise exception 'model candidate has no runtime_model'; end if;
    update public.ai_agents set model=runtime_model, updated_at=now() where id=a.id;
  end if;

  update public.ai_improvement_candidates
    set approval_status='promoted', reviewed_at=coalesce(reviewed_at,now())
    where id=c.id;

  return jsonb_build_object('candidate_id',c.id,'agent_id',a.id,'version_number',next_version,'promoted',true);
end;
$$;

revoke all on function public.promote_ai_improvement_candidate(uuid) from public;
grant execute on function public.promote_ai_improvement_candidate(uuid) to authenticated;

create or replace function public.rollback_ai_agent_version(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.ai_agent_versions%rowtype;
  a public.ai_agents%rowtype;
  next_version integer;
begin
  select * into v from public.ai_agent_versions where id=p_version_id;
  if v.id is null or not public.is_business_member(v.business_id) then raise exception 'not authorized'; end if;

  select * into a from public.ai_agents where id=v.agent_id and business_id=v.business_id;
  if a.id is null then raise exception 'agent not found'; end if;

  select coalesce(max(version_number),0)+1 into next_version
  from public.ai_agent_versions where agent_id=a.id;

  insert into public.ai_agent_versions(
    business_id,agent_id,version_number,reason,system_prompt,model,config,capabilities,tool_registry,created_by
  ) values (
    a.business_id,a.id,next_version,'rollback:'||v.id,a.system_prompt,a.model,a.config,a.capabilities,v.tool_registry,auth.uid()
  );

  update public.ai_agents
    set system_prompt=v.system_prompt, model=v.model, config=v.config, capabilities=v.capabilities, updated_at=now()
    where id=a.id;

  return jsonb_build_object('agent_id',a.id,'restored_version',v.version_number,'new_version',next_version);
end;
$$;

revoke all on function public.rollback_ai_agent_version(uuid) from public;
grant execute on function public.rollback_ai_agent_version(uuid) to authenticated;
