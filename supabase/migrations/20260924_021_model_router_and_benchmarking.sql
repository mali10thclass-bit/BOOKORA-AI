-- Model router and benchmark foundation for BOOKORA AI
create table if not exists public.ai_model_benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_model_catalog(id) on delete cascade,
  suite text not null,
  task_type text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  case_count integer not null default 0,
  passed_count integer not null default 0,
  score numeric,
  avg_latency_ms numeric,
  total_input_tokens bigint,
  total_output_tokens bigint,
  estimated_cost_usd numeric,
  summary text,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_model_benchmark_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_model_benchmark_runs(id) on delete cascade,
  model_id uuid not null references public.ai_model_catalog(id) on delete cascade,
  case_key text not null,
  input text not null,
  output text,
  passed boolean not null default false,
  score numeric not null default 0,
  latency_ms numeric,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric,
  feedback text,
  created_at timestamptz not null default now(),
  unique(run_id, case_key)
);

create index if not exists ai_model_benchmark_runs_status_idx
  on public.ai_model_benchmark_runs(status, created_at desc);
create index if not exists ai_model_benchmark_results_run_idx
  on public.ai_model_benchmark_results(run_id, created_at);

alter table public.ai_model_benchmark_runs enable row level security;
alter table public.ai_model_benchmark_results enable row level security;

drop policy if exists "authenticated_read_model_benchmark_runs" on public.ai_model_benchmark_runs;
create policy "authenticated_read_model_benchmark_runs"
on public.ai_model_benchmark_runs
for select to authenticated
using (true);

drop policy if exists "authenticated_read_model_benchmark_results" on public.ai_model_benchmark_results;
create policy "authenticated_read_model_benchmark_results"
on public.ai_model_benchmark_results
for select to authenticated
using (true);

revoke all on public.ai_model_benchmark_runs from anon, authenticated;
revoke all on public.ai_model_benchmark_results from anon, authenticated;
grant select on public.ai_model_benchmark_runs to authenticated;
grant select on public.ai_model_benchmark_results to authenticated;

create or replace function public.route_ai_model(
  p_task_type text,
  p_required_capabilities jsonb default '{}'::jsonb,
  p_preferred_provider text default null
)
returns table (
  model_id uuid,
  provider text,
  model_key text,
  runtime_model text,
  display_name text,
  capabilities jsonb,
  context_window integer,
  profile_score numeric,
  routing_reason text
)
language sql
security definer
set search_path = public
as $$
  with required as (
    select key, value
    from jsonb_each(coalesce(p_required_capabilities, '{}'::jsonb))
    where jsonb_typeof(value) = 'boolean' and value = 'true'::jsonb
  ),
  candidates as (
    select
      c.id,
      c.provider,
      c.model_key,
      c.runtime_model,
      c.display_name,
      c.capabilities,
      c.context_window,
      coalesce((
        select avg(mc.profile_score)
        from public.ai_model_comparisons mc
        where mc.model_id = c.id
          and mc.benchmark_domain = p_task_type
      ), 0) as profile_score
    from public.ai_model_catalog c
    where c.runtime_compatible = true
      and coalesce(c.status, 'active') not in ('deprecated','shutdown','disabled')
      and (p_preferred_provider is null or c.provider = p_preferred_provider)
      and not exists (
        select 1
        from required r
        where coalesce((c.capabilities ->> r.key)::boolean, false) is distinct from true
      )
  )
  select
    id,
    provider,
    model_key,
    runtime_model,
    display_name,
    capabilities,
    context_window,
    profile_score,
    case
      when p_preferred_provider is not null then 'provider preference + capability match + profile'
      when profile_score > 0 then 'capability match + documented profile'
      else 'capability match; no task-specific profile'
    end
  from candidates
  order by profile_score desc, context_window desc nulls last, provider, model_key
  limit 5;
$$;

revoke all on function public.route_ai_model(text,jsonb,text) from public, anon;
grant execute on function public.route_ai_model(text,jsonb,text) to authenticated, service_role;

comment on function public.route_ai_model(text,jsonb,text)
is 'Returns eligible runtime-compatible models for an agent task. It never changes an agent model automatically; callers must explicitly select and persist a result.';

create or replace function public.claim_ai_model_benchmark_runs(p_limit integer default 5)
returns setof public.ai_model_benchmark_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if v_role <> 'service_role' then
    raise exception 'service role required';
  end if;

  return query
  with picked as (
    select id
    from public.ai_model_benchmark_runs
    where status = 'queued'
    order by created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 25))
  )
  update public.ai_model_benchmark_runs r
  set status = 'running',
      started_at = now()
  from picked
  where r.id = picked.id
  returning r.*;
end;
$$;

revoke all on function public.claim_ai_model_benchmark_runs(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_model_benchmark_runs(integer) to service_role;
