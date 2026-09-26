-- BOOKORA AI knowledge foundation prerequisites.
create table if not exists public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  source_type text not null default 'manual',
  content text not null default '',
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_knowledge_sources_business_idx on public.ai_knowledge_sources(business_id,created_at desc);
alter table public.ai_knowledge_sources enable row level security;
drop policy if exists ai_knowledge_sources_member on public.ai_knowledge_sources;
create policy ai_knowledge_sources_member on public.ai_knowledge_sources for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
grant select,insert,update,delete on public.ai_knowledge_sources to authenticated;

create table if not exists public.ai_training_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prompt text not null,
  expected_answer text,
  actual_answer text,
  score numeric,
  created_at timestamptz not null default now()
);
alter table public.ai_training_runs enable row level security;
drop policy if exists ai_training_runs_member on public.ai_training_runs;
create policy ai_training_runs_member on public.ai_training_runs for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
grant select,insert,update,delete on public.ai_training_runs to authenticated;

-- BOOKORA AI AI-native knowledge, evaluation and safe-action layer
alter table public.ai_knowledge_sources add column if not exists source_url text null, add column if not exists updated_at timestamptz not null default now();
create index if not exists ai_knowledge_sources_active_idx on public.ai_knowledge_sources (business_id, is_active, created_at desc);
create table if not exists public.ai_agent_policies (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, name text not null, instructions text not null default '', tone text not null default 'professional', language_policy text not null default 'match_user', escalation_enabled boolean not null default true, confirmation_required boolean not null default true, allowed_actions text[] not null default array['read']::text[], created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists ai_agent_policies_business_name_uidx on public.ai_agent_policies(business_id, name);
create table if not exists public.ai_action_requests (id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, actor_user_id uuid null references auth.users(id) on delete set null, action_type text not null, target_type text null, target_id uuid null, proposal jsonb not null default '{}'::jsonb, status text not null default 'pending' check (status in ('pending','approved','rejected','executed','failed','expired')), reason text null, approved_at timestamptz null, executed_at timestamptz null, created_at timestamptz not null default now());
create index if not exists ai_action_requests_business_idx on public.ai_action_requests(business_id, created_at desc);
create index if not exists ai_action_requests_pending_idx on public.ai_action_requests(business_id, status) where status = 'pending';
alter table public.ai_agent_policies enable row level security;
alter table public.ai_action_requests enable row level security;
drop policy if exists ai_agent_policies_select_member on public.ai_agent_policies;
create policy ai_agent_policies_select_member on public.ai_agent_policies for select to authenticated using (public.is_business_member(business_id));
drop policy if exists ai_agent_policies_insert_member on public.ai_agent_policies;
create policy ai_agent_policies_insert_member on public.ai_agent_policies for insert to authenticated with check (public.is_business_member(business_id));
drop policy if exists ai_agent_policies_update_member on public.ai_agent_policies;
create policy ai_agent_policies_update_member on public.ai_agent_policies for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
drop policy if exists ai_agent_policies_delete_member on public.ai_agent_policies;
create policy ai_agent_policies_delete_member on public.ai_agent_policies for delete to authenticated using (public.is_business_member(business_id));
drop policy if exists ai_action_requests_select_member on public.ai_action_requests;
create policy ai_action_requests_select_member on public.ai_action_requests for select to authenticated using (public.is_business_member(business_id));
drop policy if exists ai_action_requests_insert_member on public.ai_action_requests;
create policy ai_action_requests_insert_member on public.ai_action_requests for insert to authenticated with check (public.is_business_member(business_id) and actor_user_id = auth.uid() and status = 'pending');
drop policy if exists ai_action_requests_update_member on public.ai_action_requests;
create policy ai_action_requests_update_member on public.ai_action_requests for update to authenticated using (public.is_business_member(business_id) and actor_user_id = auth.uid()) with check (public.is_business_member(business_id) and actor_user_id = auth.uid() and status in ('pending','rejected'));
create policy ai_action_requests_decision_member on public.ai_action_requests for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create or replace function public.create_ai_action_request(p_business_id uuid,p_action_type text,p_target_type text default null,p_target_id uuid default null,p_proposal jsonb default '{}'::jsonb,p_reason text default null) returns uuid language plpgsql security definer volatile set search_path = public as $$ declare v_id uuid; begin if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if; if btrim(coalesce(p_action_type,'')) = '' or length(p_action_type) > 120 then raise exception 'Invalid action type'; end if; insert into public.ai_action_requests(business_id,actor_user_id,action_type,target_type,target_id,proposal,status,reason) values(p_business_id,auth.uid(),btrim(p_action_type),nullif(btrim(coalesce(p_target_type,'')),''),p_target_id,coalesce(p_proposal,'{}'::jsonb),'pending',p_reason) returning id into v_id; return v_id; end; $$;
revoke all on function public.create_ai_action_request(uuid,text,text,uuid,jsonb,text) from public;
grant execute on function public.create_ai_action_request(uuid,text,text,uuid,jsonb,text) to authenticated;
create or replace function public.set_ai_action_request_decision(p_request_id uuid,p_status text,p_reason text default null) returns boolean language plpgsql security definer volatile set search_path = public as $$ declare v_business_id uuid; begin if p_status not in ('approved','rejected') then raise exception 'Invalid decision'; end if; select business_id into v_business_id from public.ai_action_requests where id=p_request_id for update; if v_business_id is null or not public.is_business_member(v_business_id) then raise exception 'Not authorized'; end if; update public.ai_action_requests set status=p_status,reason=coalesce(p_reason,reason),approved_at=case when p_status='approved' then now() else approved_at end where id=p_request_id and status='pending'; return found; end; $$;
revoke all on function public.set_ai_action_request_decision(uuid,text,text) from public;
grant execute on function public.set_ai_action_request_decision(uuid,text,text) to authenticated;
create or replace function public.record_ai_training_run(p_business_id uuid,p_prompt text,p_expected_answer text default null,p_actual_answer text default null,p_score numeric default null) returns uuid language plpgsql security definer volatile set search_path = public as $$ declare v_id uuid; begin if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if; if btrim(coalesce(p_prompt,''))='' then raise exception 'Prompt is required'; end if; insert into public.ai_training_runs(business_id,prompt,expected_answer,actual_answer,score) values(p_business_id,left(btrim(p_prompt),10000),nullif(left(coalesce(p_expected_answer,''),20000),''),nullif(left(coalesce(p_actual_answer,''),20000),''),case when p_score is null then null else greatest(0,least(100,p_score)) end) returning id into v_id; return v_id; end; $$;
revoke all on function public.record_ai_training_run(uuid,text,text,text,numeric) from public;
grant execute on function public.record_ai_training_run(uuid,text,text,text,numeric) to authenticated;
insert into public.ai_agent_policies(business_id,name,instructions) select b.id,'Default Business Agent','Answer from verified business knowledge and database data. Never invent availability, prices, policies, customer facts or financial values. Ask for clarification when required. Escalate sensitive or uncertain requests to a human.' from public.businesses b where not exists (select 1 from public.ai_agent_policies p where p.business_id=b.id and p.name='Default Business Agent');

-- RAG foundation: chunked business knowledge with pgvector.
create extension if not exists vector with schema extensions;

create table if not exists public.ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_id uuid not null references public.ai_knowledge_sources(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(384),
  status text not null default 'pending'
    check (status in ('pending','indexed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, chunk_index)
);

create index if not exists ai_knowledge_chunks_business_idx
  on public.ai_knowledge_chunks(business_id, source_id);
create index if not exists ai_knowledge_chunks_status_idx
  on public.ai_knowledge_chunks(status, created_at);

alter table public.ai_knowledge_chunks enable row level security;

drop policy if exists ai_knowledge_chunks_select_member on public.ai_knowledge_chunks;
create policy ai_knowledge_chunks_select_member
on public.ai_knowledge_chunks for select to authenticated
using (public.is_business_member(business_id));

drop policy if exists ai_knowledge_chunks_insert_member on public.ai_knowledge_chunks;
create policy ai_knowledge_chunks_insert_member
on public.ai_knowledge_chunks for insert to authenticated
with check (public.is_business_member(business_id));

drop policy if exists ai_knowledge_chunks_update_member on public.ai_knowledge_chunks;
create policy ai_knowledge_chunks_update_member
on public.ai_knowledge_chunks for update to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

drop policy if exists ai_knowledge_chunks_delete_member on public.ai_knowledge_chunks;
create policy ai_knowledge_chunks_delete_member
on public.ai_knowledge_chunks for delete to authenticated
using (public.is_business_member(business_id));

create or replace function public.search_ai_knowledge(
  p_business_id uuid,
  p_query_embedding extensions.vector(384),
  p_match_threshold real default 0.70,
  p_match_count integer default 8
)
returns table (
  chunk_id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  similarity real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.source_id,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> p_query_embedding))::real as similarity
  from public.ai_knowledge_chunks c
  where c.business_id = p_business_id
    and c.status = 'indexed'
    and c.embedding is not null
    and public.is_business_member(c.business_id)
    and (1 - (c.embedding <=> p_query_embedding)) >= greatest(0, least(1, p_match_threshold))
  order by c.embedding <=> p_query_embedding
  limit greatest(1, least(50, p_match_count));
$$;

revoke all on function public.search_ai_knowledge(uuid,extensions.vector(384),real,integer) from public;
grant execute on function public.search_ai_knowledge(uuid,extensions.vector(384),real,integer) to authenticated;
