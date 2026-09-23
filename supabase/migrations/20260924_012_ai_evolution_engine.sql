-- BOOKORA AI Continuous AI Evolution Engine
-- Discovers public AI/model/agent updates, records evidence, proposes safe improvements,
-- and lets approved changes feed agent runtime without replacing tenant data.

alter table public.ai_agents
  add column if not exists auto_update_enabled boolean not null default true,
  add column if not exists evolution_policy jsonb not null default '{"auto_promote_model_updates":true,"auto_promote_prompt_updates":false,"require_regression_pass":true}'::jsonb;

create table if not exists public.ai_model_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_key text not null,
  runtime_model text,
  runtime_compatible boolean not null default false,
  display_name text not null,
  capabilities jsonb not null default '{}'::jsonb,
  context_window integer,
  status text not null default 'discovered' check (status in ('discovered','validated','approved','deprecated','blocked')),
  source_url text,
  evidence jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, model_key)
);

create table if not exists public.ai_trainer_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('provider','agent_platform','research','release_notes','docs','benchmark','community')),
  source_url text not null unique,
  trust_level text not null default 'official' check (trust_level in ('official','verified','community')),
  enabled boolean not null default true,
  fetch_interval_minutes integer not null default 360 check (fetch_interval_minutes >= 15),
  last_fetched_at timestamptz,
  last_http_status integer,
  content_digest text,
  last_title text,
  last_excerpt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_evolution_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  trigger text not null default 'scheduled' check (trigger in ('scheduled','manual','model_update','evaluation')),
  sources_scanned integer not null default 0,
  models_discovered integer not null default 0,
  candidates_created integer not null default 0,
  summary text,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_improvement_candidates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete cascade,
  evolution_run_id uuid references public.ai_evolution_runs(id) on delete cascade,
  improvement_type text not null check (improvement_type in ('model','prompt','knowledge','tool','guardrail','workflow')),
  title text not null,
  proposal jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  risk_level text not null default 'low' check (risk_level in ('low','medium','high')),
  baseline_score numeric(6,4),
  candidate_score numeric(6,4),
  regression_passed boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','promoted','rolled_back')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.ai_agent_eval_cases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid not null references public.ai_agents(id) on delete cascade,
  name text not null,
  input text not null,
  expected_criteria jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ai_model_catalog_status_idx on public.ai_model_catalog(status, last_seen_at desc);
create index if not exists ai_trainer_sources_enabled_idx on public.ai_trainer_sources(enabled, last_fetched_at);
create index if not exists ai_evolution_runs_status_idx on public.ai_evolution_runs(status, created_at desc);
create index if not exists ai_improvement_candidates_agent_idx on public.ai_improvement_candidates(agent_id, approval_status, created_at desc);
create index if not exists ai_agent_eval_cases_agent_idx on public.ai_agent_eval_cases(agent_id, enabled);

alter table public.ai_model_catalog enable row level security;
alter table public.ai_trainer_sources enable row level security;
alter table public.ai_evolution_runs enable row level security;
alter table public.ai_improvement_candidates enable row level security;
alter table public.ai_agent_eval_cases enable row level security;

grant select on public.ai_model_catalog to authenticated;
revoke insert,update,delete on public.ai_model_catalog from authenticated;
grant select,insert,update,delete on public.ai_trainer_sources to authenticated;
grant select,insert,update on public.ai_evolution_runs to authenticated;
grant select,insert,update on public.ai_improvement_candidates to authenticated;
grant select,insert,update,delete on public.ai_agent_eval_cases to authenticated;

drop policy if exists ai_trainer_sources_member on public.ai_trainer_sources;
create policy ai_trainer_sources_read on public.ai_trainer_sources for select to authenticated using (true);

drop policy if exists ai_model_catalog_read on public.ai_model_catalog;
create policy ai_model_catalog_read on public.ai_model_catalog for select to authenticated using (true);

drop policy if exists ai_evolution_runs_member on public.ai_evolution_runs;
create policy ai_evolution_runs_member on public.ai_evolution_runs for all to authenticated
using (business_id is null or public.is_business_member(business_id))
with check (business_id is null or public.is_business_member(business_id));

drop policy if exists ai_improvement_candidates_member on public.ai_improvement_candidates;
create policy ai_improvement_candidates_member on public.ai_improvement_candidates for all to authenticated
using (business_id is null or public.is_business_member(business_id))
with check (business_id is null or public.is_business_member(business_id));

drop policy if exists ai_agent_eval_cases_member on public.ai_agent_eval_cases;
create policy ai_agent_eval_cases_member on public.ai_agent_eval_cases for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

insert into public.ai_trainer_sources (name,source_type,source_url,trust_level)
values
 ('OpenAI developer updates','provider','https://openai.com/news/','official'),
 ('OpenAI agent documentation','agent_platform','https://developers.openai.com/api/docs/guides/agents','official'),
 ('Anthropic newsroom','provider','https://www.anthropic.com/news','official'),
 ('Google Developers AI updates','provider','https://developers.googleblog.com/','official'),
 ('Meta AI blog','provider','https://ai.meta.com/blog/','official'),
 ('Microsoft AI agent documentation','agent_platform','https://learn.microsoft.com/en-us/microsoft-copilot-studio/','official')
on conflict (source_url) do nothing;

create or replace function public.ai_runtime_model(p_business_id uuid, p_agent_id uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  selected text;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(
    case when a.auto_update_enabled and coalesce(a.evolution_policy->>'auto_promote_model_updates','true')='true'
      then (
        select coalesce(m.runtime_model,m.model_key) from public.ai_model_catalog m
        where m.status='approved'
          and m.runtime_compatible=true
          and (m.capabilities->>'agentic')::boolean is not false
        order by m.last_seen_at desc
        limit 1
      )
    end,
    a.model,
    'openai/gpt-6-astra'
  )
  into selected
  from public.ai_agents a
  where a.id=p_agent_id and a.business_id=p_business_id and a.status='active';

  return coalesce(selected,'openai/gpt-6-astra');
end;
$$;

revoke all on function public.ai_runtime_model(uuid,uuid) from public;
grant execute on function public.ai_runtime_model(uuid,uuid) to authenticated;
