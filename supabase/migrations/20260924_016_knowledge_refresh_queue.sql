-- BOOKORA AI production knowledge refresh queue and worker-safe indexing
create table if not exists public.ai_knowledge_refresh_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_id uuid not null references public.ai_knowledge_sources(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  attempt_count integer not null default 0,
  last_error text,
  content_digest text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists ai_knowledge_refresh_jobs_queue_idx
on public.ai_knowledge_refresh_jobs(status, queued_at);
create unique index if not exists ai_knowledge_refresh_one_active_source_idx
on public.ai_knowledge_refresh_jobs(source_id)
where status in ('queued','running');

alter table public.ai_knowledge_refresh_jobs enable row level security;
create policy ai_knowledge_refresh_jobs_member_read
on public.ai_knowledge_refresh_jobs for select to authenticated
using (public.is_business_member(business_id));
revoke insert, update, delete on public.ai_knowledge_refresh_jobs from authenticated, anon;

create or replace function public.queue_ai_knowledge_refresh(
  p_source_id uuid
) returns uuid
language plpgsql security definer volatile set search_path=public
as $$
declare v_business_id uuid; v_job uuid;
begin
  select business_id into v_business_id from public.ai_knowledge_sources where id=p_source_id and is_active=true;
  if v_business_id is null or not public.is_business_member(v_business_id) then raise exception 'Not authorized'; end if;
  insert into public.ai_knowledge_refresh_jobs(business_id,source_id)
  values(v_business_id,p_source_id)
  on conflict (source_id) where status in ('queued','running') do nothing
  returning id into v_job;
  return v_job;
end;
$$;
revoke all on function public.queue_ai_knowledge_refresh(uuid) from public;
grant execute on function public.queue_ai_knowledge_refresh(uuid) to authenticated;

create or replace function public.claim_ai_knowledge_refresh_job(
  p_limit integer default 10
) returns table(
  id uuid, business_id uuid, source_id uuid, source_url text,
  source_name text, source_type text, current_digest text, attempt_count integer
)
language plpgsql security definer volatile set search_path=public
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.ai_knowledge_refresh_jobs j
    join public.ai_knowledge_sources s on s.id=j.source_id
    where j.status='queued'
      and s.is_active=true
      and j.attempt_count < 5
    order by j.queued_at
    for update of j skip locked
    limit greatest(1,least(25,coalesce(p_limit,10)))
  ), claimed as (
    update public.ai_knowledge_refresh_jobs j
    set status='running', attempt_count=j.attempt_count+1,
        started_at=now(), updated_at=now()
    from candidates c where j.id=c.id
    returning j.*
  )
  select j.id,j.business_id,j.source_id,s.source_url,s.name,s.source_type,
         j.content_digest,j.attempt_count
  from claimed j join public.ai_knowledge_sources s on s.id=j.source_id;
end;
$$;
revoke all on function public.claim_ai_knowledge_refresh_job(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_knowledge_refresh_job(integer) to service_role;

create or replace function public.finish_ai_knowledge_refresh(
  p_job_id uuid, p_digest text, p_changed boolean
) returns boolean
language plpgsql security definer volatile set search_path=public
as $$
declare v_source uuid;
begin
  select source_id into v_source from public.ai_knowledge_refresh_jobs where id=p_job_id and status='running' for update;
  if v_source is null then return false; end if;
  update public.ai_knowledge_refresh_jobs
  set status='completed', content_digest=p_digest, completed_at=now(), updated_at=now(), last_error=null
  where id=p_job_id and status='running';
  return found;
end;
$$;
revoke all on function public.finish_ai_knowledge_refresh(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.finish_ai_knowledge_refresh(uuid,text,boolean) to service_role;

create or replace function public.fail_ai_knowledge_refresh(
  p_job_id uuid, p_error text
) returns boolean
language plpgsql security definer volatile set search_path=public
as $$
declare v_attempts integer;
begin
  select attempt_count into v_attempts from public.ai_knowledge_refresh_jobs where id=p_job_id and status='running' for update;
  if v_attempts is null then return false; end if;
  update public.ai_knowledge_refresh_jobs
  set status=case when v_attempts >= 5 then 'failed' else 'queued' end,
      last_error=left(coalesce(p_error,'Knowledge refresh failed'),2000),
      updated_at=now()
  where id=p_job_id;
  return found;
end;
$$;
revoke all on function public.fail_ai_knowledge_refresh(uuid,text) from public, anon, authenticated;
grant execute on function public.fail_ai_knowledge_refresh(uuid,text) to service_role;

-- Allow the trusted worker to invoke the existing indexing pipeline.
create or replace function public.index_ai_knowledge_source(p_source_id uuid)
returns integer
language plpgsql security definer
set search_path=public
as $$
declare
  s public.ai_knowledge_sources;
  v_count integer := 0;
  v_text text;
  v_chunk_size constant integer := 1200;
  v_chunks integer;
  i integer;
  v_role text := coalesce(current_setting('request.jwt.claim.role', true),'');
begin
  select * into s from public.ai_knowledge_sources where id=p_source_id for update;
  if not found then raise exception 'Knowledge source not found'; end if;
  if v_role <> 'service_role' and not public.is_business_member(s.business_id) then raise exception 'Not authorized'; end if;

  delete from public.ai_knowledge_chunks where source_id=p_source_id;
  v_text := btrim(coalesce(s.content,''));
  if v_text='' then return 0; end if;
  v_chunks := ceil(length(v_text)::numeric / v_chunk_size)::integer;
  for i in 0..(v_chunks-1) loop
    insert into public.ai_knowledge_chunks(business_id,source_id,chunk_index,content,metadata,status)
    values(s.business_id,p_source_id,i,substr(v_text,(i*v_chunk_size)+1,v_chunk_size),
      jsonb_build_object('source_name',s.name,'source_type',s.source_type),'pending');
    v_count := v_count+1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.index_ai_knowledge_source(uuid) from public, anon, authenticated;
grant execute on function public.index_ai_knowledge_source(uuid) to authenticated, service_role;
