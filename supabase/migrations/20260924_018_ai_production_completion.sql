-- BOOKORA AI production completion: generation queue, scheduled worker helpers and durable job retry state.
alter table public.ai_agent_schedules
  add column if not exists last_error text,
  add column if not exists run_count integer not null default 0;

alter table public.ai_generation_jobs
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists provider text,
  add column if not exists model text;

create index if not exists ai_generation_jobs_queue_idx on public.ai_generation_jobs(status,created_at);

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
  ) select id,business_id,agent_id from u;
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
  ) select id,business_id,agent_id,job_type,prompt,input,attempt_count,max_attempts from u;
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
   set last_run_at=now(),next_run_at=now()+make_interval(mins=>greatest(15,s.interval_minutes)),
       run_count=s.run_count+1,updated_at=now()
   from c where s.id=c.id returning s.*
 ) select id,business_id,agent_id,name,prompt from u;
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
 where s.name='Daily AI evolution' and s.enabled=true
   and s.last_run_at>=now()-interval '2 minutes'
   and not exists (
     select 1 from public.ai_evolution_runs r
     where r.business_id=s.business_id and r.agent_id=s.agent_id and r.status in ('queued','running')
   );
 get diagnostics n=row_count;
 return n;
end; $$;
revoke all on function public.enqueue_scheduled_ai_evolution() from public;
grant execute on function public.enqueue_scheduled_ai_evolution() to service_role;


create or replace function public.enforce_ai_ultimate_plan()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not public.bookora_plan_allows_feature(new.business_id, case
    when tg_table_name='ai_generation_jobs' then 'ai_generation'
    when tg_table_name='ai_agent_schedules' then 'ai_evolution'
    when tg_table_name='ai_agents' then 'ai_agent_studio'
    when tg_table_name='ai_agent_eval_runs' then 'ai_agent_operations'
    else 'ai_agent_operations' end) then
    raise exception 'This AI capability requires an Ultimate or Enterprise plan';
  end if;
  return new;
end; $$;

drop trigger if exists ai_agents_plan_guard on public.ai_agents;
create trigger ai_agents_plan_guard before insert or update on public.ai_agents
for each row execute function public.enforce_ai_ultimate_plan();

drop trigger if exists ai_generation_jobs_plan_guard on public.ai_generation_jobs;
create trigger ai_generation_jobs_plan_guard before insert or update on public.ai_generation_jobs
for each row execute function public.enforce_ai_ultimate_plan();

drop trigger if exists ai_agent_schedules_plan_guard on public.ai_agent_schedules;
create trigger ai_agent_schedules_plan_guard before insert or update on public.ai_agent_schedules
for each row execute function public.enforce_ai_ultimate_plan();
