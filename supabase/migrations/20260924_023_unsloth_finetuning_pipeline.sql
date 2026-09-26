-- BOOKORA AI: isolated fine-tuning control plane for Unsloth/adapter training.
-- Training execution MUST happen in a dedicated worker with no service-role key exposed to clients.

create table if not exists public.ai_finetune_datasets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  name text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','ready','retired')),
  base_model text not null,
  dataset_hash text,
  example_count integer not null default 0 check (example_count >= 0),
  examples jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_finetune_datasets_business_name_version
  on public.ai_finetune_datasets (business_id, name, version);

create index if not exists ai_finetune_datasets_business_agent
  on public.ai_finetune_datasets (business_id, agent_id, created_at desc);

create table if not exists public.ai_finetune_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  dataset_id uuid not null references public.ai_finetune_datasets(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued','claimed','running','evaluating','completed','failed','cancelled')),
  base_model text not null,
  trainer text not null default 'unsloth',
  training_config jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 2 check (max_attempts between 1 and 10),
  worker_id text,
  claimed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  checkpoint_path text,
  adapter_path text,
  metrics jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_finetune_jobs_queue
  on public.ai_finetune_jobs (status, created_at)
  where status in ('queued','claimed','running','evaluating');

create index if not exists ai_finetune_jobs_business
  on public.ai_finetune_jobs (business_id, created_at desc);

alter table public.ai_finetune_datasets enable row level security;
alter table public.ai_finetune_jobs enable row level security;

drop policy if exists ai_finetune_datasets_member_read on public.ai_finetune_datasets;
create policy ai_finetune_datasets_member_read
on public.ai_finetune_datasets
for select to authenticated
using (is_business_member(business_id));

drop policy if exists ai_finetune_jobs_member_read on public.ai_finetune_jobs;
create policy ai_finetune_jobs_member_read
on public.ai_finetune_jobs
for select to authenticated
using (is_business_member(business_id));

create or replace function public.claim_ai_finetune_jobs(p_worker_id text, p_limit integer default 1)
returns setof public.ai_finetune_jobs
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 10));
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'service_role required';
  end if;
  return query
  with picked as (
    select id from public.ai_finetune_jobs
    where status = 'queued' and attempt_count < max_attempts
    order by created_at
    for update skip locked limit v_limit
  )
  update public.ai_finetune_jobs j
  set status='claimed', worker_id=p_worker_id, claimed_at=now(),
      attempt_count=j.attempt_count+1, updated_at=now()
  from picked where j.id=picked.id
  returning j.*;
end;
$$;

revoke all on function public.claim_ai_finetune_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_ai_finetune_jobs(text, integer) to service_role;

create or replace function public.start_ai_finetune_job(p_job_id uuid, p_worker_id text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'service_role required';
  end if;
  update public.ai_finetune_jobs
  set status='running', started_at=coalesce(started_at, now()), updated_at=now()
  where id=p_job_id and worker_id=p_worker_id and status='claimed';
  return found;
end;
$$;

revoke all on function public.start_ai_finetune_job(uuid, text) from public, anon, authenticated;
grant execute on function public.start_ai_finetune_job(uuid, text) to service_role;

create or replace function public.complete_ai_finetune_job(
  p_job_id uuid, p_worker_id text, p_status text,
  p_checkpoint_path text default null, p_adapter_path text default null,
  p_metrics jsonb default '{}'::jsonb, p_error text default null
)
returns boolean language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_status not in ('completed','failed','cancelled','evaluating') then
    raise exception 'invalid finetune status';
  end if;
  update public.ai_finetune_jobs
  set status=p_status,
      checkpoint_path=coalesce(p_checkpoint_path, checkpoint_path),
      adapter_path=coalesce(p_adapter_path, adapter_path),
      metrics=coalesce(p_metrics, '{}'::jsonb), error=p_error,
      finished_at=case when p_status in ('completed','failed','cancelled') then now() else finished_at end,
      updated_at=now()
  where id=p_job_id and worker_id=p_worker_id and status in ('claimed','running','evaluating');
  return found;
end;
$$;

revoke all on function public.complete_ai_finetune_job(uuid,text,text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.complete_ai_finetune_job(uuid,text,text,text,text,jsonb,text) to service_role;

revoke insert, update, delete on public.ai_finetune_datasets from anon, authenticated;
revoke insert, update, delete on public.ai_finetune_jobs from anon, authenticated;
