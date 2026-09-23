-- BOOKORA AI production completion: evaluation queue, scheduled evolution, agent versions/rollback, generation jobs.
alter table public.ai_agent_schedules
  add column if not exists interval_minutes integer not null default 1440,
  add column if not exists last_error text,
  add column if not exists run_count integer not null default 0;

alter table public.ai_generation_jobs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists provider text,
  add column if not exists model text;

create table if not exists public.ai_agent_eval_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  case_count integer not null default 0,
  passed_count integer not null default 0,
  score numeric(6,4),
  summary text,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
create index if not exists ai_agent_eval_runs_queue_idx on public.ai_agent_eval_runs(status,created_at);
alter table public.ai_agent_eval_runs enable row level security;
grant select,insert,update on public.ai_agent_eval_runs to authenticated;
drop policy if exists ai_agent_eval_runs_member on public.ai_agent_eval_runs;
create policy ai_agent_eval_runs_member on public.ai_agent_eval_runs for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create table if not exists public.ai_agent_eval_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_agent_eval_runs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  case_id uuid not null references public.ai_agent_eval_cases(id) on delete cascade,
  input text not null,
  output text not null,
  passed boolean not null,
  score numeric(6,4) not null,
  feedback text,
  created_at timestamptz not null default now()
);
create index if not exists ai_agent_eval_results_run_idx on public.ai_agent_eval_results(run_id,created_at);
alter table public.ai_agent_eval_results enable row level security;
grant select on public.ai_agent_eval_results to authenticated;
drop policy if exists ai_agent_eval_results_member on public.ai_agent_eval_results;
create policy ai_agent_eval_results_member on public.ai_agent_eval_results for select to authenticated
using (public.is_business_member(business_id));

create table if not exists public.ai_agent_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  version_number integer not null,
  label text not null,
  source text not null default 'manual' check (source in ('manual','candidate','rollback','system')),
  system_prompt text not null,
  model text,
  config jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(agent_id,version_number)
);
alter table public.ai_agents add column if not exists active_version_id uuid references public.ai_agent_versions(id) on delete set null;
alter table public.ai_agent_versions enable row level security;
grant select,insert,update on public.ai_agent_versions to authenticated;
drop policy if exists ai_agent_versions_member on public.ai_agent_versions;
create policy ai_agent_versions_member on public.ai_agent_versions for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create or replace function public.snapshot_ai_agent_version(
  p_agent_id uuid, p_label text default 'Snapshot', p_source text default 'manual'
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  a public.ai_agents%rowtype;
  next_version integer;
  vid uuid;
begin
  select * into a from public.ai_agents where id=p_agent_id for update;
  if a.id is null or not public.is_business_member(a.business_id) then raise exception 'not authorized'; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.ai_agent_versions where agent_id=a.id;
  insert into public.ai_agent_versions(business_id,agent_id,version_number,label,source,system_prompt,model,config,capabilities,created_by)
  values(a.business_id,a.id,next_version,coalesce(nullif(p_label,''),'Snapshot'),
    case when p_source in ('manual','candidate','rollback','system') then p_source else 'manual' end,
    a.system_prompt,a.model,a.config,a.capabilities,auth.uid())
  returning id into vid;
  update public.ai_agents set active_version_id=vid,updated_at=now() where id=a.id;
  return vid;
end; $$;
revoke all on function public.snapshot_ai_agent_version(uuid,text,text) from public;
grant execute on function public.snapshot_ai_agent_version(uuid,text,text) to authenticated;

create or replace function public.rollback_ai_agent_version(p_agent_id uuid,p_version_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare a public.ai_agents%rowtype; v public.ai_agent_versions%rowtype; new_id uuid;
begin
  select * into a from public.ai_agents where id=p_agent_id for update;
  select * into v from public.ai_agent_versions where id=p_version_id and agent_id=p_agent_id;
  if a.id is null or v.id is null or a.business_id<>v.business_id or not public.is_business_member(a.business_id) then raise exception 'not authorized'; end if;
  update public.ai_agents set system_prompt=v.system_prompt,model=v.model,config=v.config,capabilities=v.capabilities,active_version_id=v.id,updated_at=now() where id=a.id;
  perform public.snapshot_ai_agent_version(a.id,'Rollback to v'||v.version_number,'rollback');
  return true;
end; $$;
revoke all on function public.rollback_ai_agent_version(uuid,uuid) from public;
grant execute on function public.rollback_ai_agent_version(uuid,uuid) to authenticated;

create or replace function public.claim_ai_eval_runs(p_limit integer default 3)
returns table(id uuid,business_id uuid,agent_id uuid)
language plpgsql security definer volatile set search_path=public as $$
begin
  return query
  with c as (
    select r.id from public.ai_agent_eval_runs r
    where r.status='queued' order by r.created_at for update skip locked
    limit greatest(1,least(10,coalesce(p_limit,3)))
  ), u as (
    update public.ai_agent_eval_runs r set status='running',started_at=now()
    from c where r.id=c.id and r.status='queued' returning r.*
  )
  select id,business_id,agent_id from u;
end; $$;
revoke all on function public.claim_ai_eval_runs(integer) from public,anon,authenticated;
grant execute on function public.claim_ai_eval_runs(integer) to service_role;

create or replace function public.claim_ai_generation_jobs(p_limit integer default 3)
returns table(id uuid,business_id uuid,agent_id uuid,job_type text,prompt text,input jsonb,attempt_count integer,max_attempts integer)
language plpgsql security definer volatile set search_path=public as $$
begin
  return query
  with c as (
    select j.id from public.ai_generation_jobs j
    where j.status='queued' and j.attempt_count < j.max_attempts
    order by j.created_at for update skip locked
    limit greatest(1,least(10,coalesce(p_limit,3)))
  ), u as (
    update public.ai_generation_jobs j set status='processing',started_at=now(),attempt_count=j.attempt_count+1
    from c where j.id=c.id and j.status='queued' returning j.*
  )
  select id,business_id,agent_id,job_type,prompt,input,attempt_count,max_attempts from u;
end; $$;
revoke all on function public.claim_ai_generation_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_ai_generation_jobs(integer) to service_role;

create or replace function public.complete_ai_generation_job(p_job_id uuid,p_output jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 update public.ai_generation_jobs set status='completed',output=coalesce(p_output,'{}'::jsonb),error=null,completed_at=now()
 where id=p_job_id and status='processing';
 return found;
end; $$;
revoke all on function public.complete_ai_generation_job(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_ai_generation_job(uuid,jsonb) to service_role;

create or replace function public.fail_ai_generation_job(p_job_id uuid,p_error text)
returns boolean language plpgsql security definer set search_path=public as $$
declare a integer; m integer;
begin
 select attempt_count,max_attempts into a,m from public.ai_generation_jobs where id=p_job_id and status='processing' for update;
 if a is null then return false; end if;
 update public.ai_generation_jobs set status=case when a>=m then 'failed' else 'queued' end,
 error=left(coalesce(p_error,'Generation failed'),2000),
 completed_at=case when a>=m then now() else null end
 where id=p_job_id;
 return found;
end; $$;
revoke all on function public.fail_ai_generation_job(uuid,text) from public,anon,authenticated;
grant execute on function public.fail_ai_generation_job(uuid,text) to service_role;

create or replace function public.claim_due_ai_schedules(p_limit integer default 10)
returns table(id uuid,business_id uuid,agent_id uuid,name text,prompt text)
language plpgsql security definer volatile set search_path=public as $$
begin
  return query
  with c as (
    select s.id from public.ai_agent_schedules s
    where s.enabled=true and (s.next_run_at is null or s.next_run_at<=now())
    order by coalesce(s.next_run_at,s.created_at) for update skip locked
    limit greatest(1,least(25,coalesce(p_limit,10)))
  ), u as (
    update public.ai_agent_schedules s
    set last_run_at=now(),next_run_at=now()+make_interval(mins=>greatest(15,s.interval_minutes)),run_count=s.run_count+1,updated_at=now()
    from c where s.id=c.id returning s.*
  )
  select id,business_id,agent_id,name,prompt from u;
end; $$;
revoke all on function public.claim_due_ai_schedules(integer) from public,anon,authenticated;
grant execute on function public.claim_due_ai_schedules(integer) to service_role;

create or replace function public.enqueue_scheduled_ai_evolution()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into public.ai_evolution_runs(business_id,agent_id,status,trigger)
 select s.business_id,s.agent_id,'queued','scheduled'
 from public.ai_agent_schedules s
 where s.name='Daily AI evolution' and s.enabled=true and s.last_run_at>=now()-interval '2 minutes'
   and not exists (
     select 1 from public.ai_evolution_runs r
     where r.business_id=s.business_id and r.agent_id=s.agent_id and r.status in ('queued','running')
   );
 get diagnostics n=row_count;
 return n;
end; $$;
revoke all on function public.enqueue_scheduled_ai_evolution() from public;
grant execute on function public.enqueue_scheduled_ai_evolution() to service_role;
