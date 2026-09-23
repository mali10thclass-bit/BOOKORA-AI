-- BOOKORA AI — production workers, RAG correctness, webhook filtering and AI action hardening

-- RAG chunks must not claim to be indexed until an embedding exists.
alter table public.ai_knowledge_chunks
  drop constraint if exists ai_knowledge_chunks_status_check;
alter table public.ai_knowledge_chunks
  add constraint ai_knowledge_chunks_status_check
  check (status in ('pending','processing','indexed','failed'));

alter table public.ai_knowledge_chunks
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists embedding_model text,
  add column if not exists embedded_at timestamptz;

create index if not exists ai_knowledge_chunks_embedding_hnsw_idx
  on public.ai_knowledge_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

-- Atomic worker claim. Only the server-side service role may call this.
create or replace function public.claim_ai_embedding_chunks(p_limit integer default 10)
returns table(
  id uuid,
  business_id uuid,
  source_id uuid,
  content text,
  attempt_count integer
)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with candidates as (
    select c.id
    from public.ai_knowledge_chunks c
    where c.status in ('pending','failed')
      and c.attempt_count < 5
      and (c.updated_at < now() - interval '15 seconds' or c.updated_at is null)
    order by c.created_at asc
    for update skip locked
    limit greatest(1, least(50, coalesce(p_limit,10)))
  ),
  claimed as (
    update public.ai_knowledge_chunks c
    set status='processing',
        attempt_count=c.attempt_count + 1,
        updated_at=now()
    from candidates x
    where c.id=x.id
    returning c.*
  )
  select c.id,c.business_id,c.source_id,c.content,c.attempt_count
  from claimed c;
end;
$$;
revoke all on function public.claim_ai_embedding_chunks(integer) from public, anon, authenticated;
grant execute on function public.claim_ai_embedding_chunks(integer) to service_role;

-- Worker can complete/fail only through a server-side RPC.
create or replace function public.finish_ai_embedding(
  p_chunk_id uuid,
  p_embedding extensions.vector(384),
  p_model text default 'gte-small'
) returns boolean
language plpgsql
security definer
set search_path=public,extensions
as $$
begin
  update public.ai_knowledge_chunks
  set embedding=p_embedding,
      embedding_model=left(coalesce(p_model,'gte-small'),100),
      embedded_at=now(),
      status='indexed',
      last_error=null,
      updated_at=now()
  where id=p_chunk_id and status='processing';
  return found;
end;
$$;
revoke all on function public.finish_ai_embedding(uuid,extensions.vector(384),text) from public, anon, authenticated;
grant execute on function public.finish_ai_embedding(uuid,extensions.vector(384),text) to service_role;

create or replace function public.fail_ai_embedding(
  p_chunk_id uuid,
  p_error text
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_attempts integer;
begin
  select attempt_count into v_attempts
  from public.ai_knowledge_chunks
  where id=p_chunk_id and status='processing'
  for update;
  if v_attempts is null then return false; end if;

  update public.ai_knowledge_chunks
  set status=case when v_attempts >= 5 then 'failed' else 'pending' end,
      last_error=left(coalesce(p_error,'Embedding worker failed'),1000),
      updated_at=now()
  where id=p_chunk_id;
  return true;
end;
$$;
revoke all on function public.fail_ai_embedding(uuid,text) from public, anon, authenticated;
grant execute on function public.fail_ai_embedding(uuid,text) to service_role;

-- Re-indexing creates chunks that are actually waiting for the embedding worker.
create or replace function public.index_ai_knowledge_source(p_source_id uuid)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.ai_knowledge_sources;
  v_count integer := 0;
  v_text text;
  v_chunk_size constant integer := 1200;
  v_chunks integer;
  i integer;
begin
  select * into s from public.ai_knowledge_sources where id=p_source_id for update;
  if not found then raise exception 'Knowledge source not found'; end if;
  if not public.is_business_member(s.business_id) then raise exception 'Not authorized'; end if;

  delete from public.ai_knowledge_chunks where source_id=p_source_id;
  v_text := btrim(coalesce(s.content,''));
  if v_text = '' then return 0; end if;

  v_chunks := ceil(length(v_text)::numeric / v_chunk_size)::integer;
  for i in 0..(v_chunks-1) loop
    insert into public.ai_knowledge_chunks(
      business_id,source_id,chunk_index,content,metadata,status
    ) values(
      s.business_id,p_source_id,i,
      substr(v_text,(i*v_chunk_size)+1,v_chunk_size),
      jsonb_build_object('source_name',s.name,'source_type',s.source_type),
      'pending'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
exception when others then
  update public.ai_knowledge_chunks
  set status='failed', last_error=left(sqlerrm,1000), updated_at=now()
  where source_id=p_source_id;
  raise;
end;
$$;
revoke all on function public.index_ai_knowledge_source(uuid) from public, anon;
grant execute on function public.index_ai_knowledge_source(uuid) to authenticated;

-- Do not allow browser-side direct status changes for AI actions.
drop policy if exists ai_action_requests_update_member on public.ai_action_requests;
drop policy if exists ai_action_requests_decision_member on public.ai_action_requests;

alter table public.ai_action_requests
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists executed_by uuid references auth.users(id) on delete set null;

create or replace function public.set_ai_action_request_decision(
  p_request_id uuid,p_status text,p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare v_business_id uuid;
begin
  if p_status not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select business_id into v_business_id
  from public.ai_action_requests
  where id=p_request_id and status='pending'
  for update;
  if v_business_id is null or not public.is_business_member(v_business_id) then raise exception 'Not authorized'; end if;

  update public.ai_action_requests
  set status=p_status,
      reason=coalesce(p_reason,reason),
      approved_at=case when p_status='approved' then now() else approved_at end,
      approved_by=case when p_status='approved' then auth.uid() else approved_by end
  where id=p_request_id and status='pending';
  return found;
end;
$$;
revoke all on function public.set_ai_action_request_decision(uuid,text,text) from public, anon;
grant execute on function public.set_ai_action_request_decision(uuid,text,text) to authenticated;

-- Stronger server-side execution validation and actor attribution.
create or replace function public.execute_ai_action(p_action_id uuid)
returns public.ai_action_requests
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.ai_action_requests;
  allowed boolean := false;
  task public.business_tasks;
  v_product_id uuid;
  v_delta numeric;
  v_due_at timestamptz;
  v_customer_id uuid;
begin
  select * into a from public.ai_action_requests where id=p_action_id for update;
  if not found then raise exception 'AI action not found'; end if;
  if not public.is_business_member(a.business_id) then raise exception 'Not authorized'; end if;
  if a.status <> 'approved' then raise exception 'AI action must be approved'; end if;
  if a.approved_by is null then raise exception 'AI action has no approver'; end if;

  select exists(
    select 1
    from public.ai_agent_policies p
    where p.business_id=a.business_id
      and a.action_type = any(p.allowed_actions)
  ) into allowed;
  if not allowed then raise exception 'Action is not allowed by the agent policy'; end if;

  if a.action_type='create_task' then
    v_due_at := case
      when nullif(btrim(a.proposal->>'due_at'),'') is null then null
      else (a.proposal->>'due_at')::timestamptz
    end;
    v_customer_id := case
      when nullif(btrim(a.proposal->>'customer_id'),'') is null then null
      else (a.proposal->>'customer_id')::uuid
    end;
    insert into public.business_tasks(business_id,title,priority,due_at,related_customer_id)
    values(
      a.business_id,
      left(coalesce(nullif(btrim(a.proposal->>'title'),''),'AI task'),200),
      left(coalesce(nullif(btrim(a.proposal->>'priority'),''),'normal'),20),
      v_due_at,v_customer_id
    ) returning * into task;
  elsif a.action_type='inventory_adjustment' then
    begin
      v_product_id := (a.proposal->>'product_id')::uuid;
      v_delta := (a.proposal->>'quantity_delta')::numeric;
    exception when others then
      raise exception 'Invalid inventory action proposal';
    end;
    if v_delta is null or v_delta=0 then raise exception 'Invalid inventory quantity'; end if;
    perform public.record_inventory_movement(
      a.business_id,v_product_id,v_delta,
      coalesce(a.proposal->>'reason','AI adjustment')
    );
  else
    raise exception 'Unsupported AI action type';
  end if;

  update public.ai_action_requests
  set status='executed', executed_at=now(), executed_by=auth.uid(),
      reason='Executed by authorized server action'
  where id=p_action_id
  returning * into a;

  insert into public.enterprise_audit_logs(
    business_id,actor_user_id,action,entity_type,entity_id,metadata
  ) values(
    a.business_id,auth.uid(),'ai_action_executed',a.target_type,a.target_id,
    jsonb_build_object('action_id',a.id,'action_type',a.action_type,'approved_by',a.approved_by)
  );
  return a;
end;
$$;
revoke all on function public.execute_ai_action(uuid) from public, anon;
grant execute on function public.execute_ai_action(uuid) to authenticated, service_role;

-- Analytics must not become a cross-tenant data oracle.
create or replace function public.get_business_analytics(
  p_business_id uuid,p_from timestamptz,p_to timestamptz
) returns jsonb
language plpgsql security definer stable set search_path=public
as $$
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'bookings',(select count(*) from public.bookings b where b.business_id=p_business_id and b.start_time>=p_from and b.start_time<p_to),
    'completed',(select count(*) from public.bookings b where b.business_id=p_business_id and b.status='completed' and b.start_time>=p_from and b.start_time<p_to),
    'cancelled',(select count(*) from public.bookings b where b.business_id=p_business_id and b.status='cancelled' and b.start_time>=p_from and b.start_time<p_to),
    'no_shows',(select count(*) from public.bookings b where b.business_id=p_business_id and b.status='no_show' and b.start_time>=p_from and b.start_time<p_to),
    'revenue',(select coalesce(sum(pay.amount),0) from public.payments pay where pay.business_id=p_business_id and pay.status in ('paid','partial') and pay.created_at>=p_from and pay.created_at<p_to),
    'customers',(select count(*) from public.customers c where c.business_id=p_business_id and c.created_at>=p_from and c.created_at<p_to)
  );
end;
$$;
revoke all on function public.get_business_analytics(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_business_analytics(uuid,timestamptz,timestamptz) to authenticated;

-- Webhook delivery must respect the webhook's subscribed event list.
create or replace function public.enqueue_webhook_delivery(
  p_business_id uuid,p_event_type text,p_payload jsonb
) returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer := 0;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  if btrim(coalesce(p_event_type,''))='' then raise exception 'Event type is required'; end if;

  insert into public.webhook_deliveries(business_id,webhook_id,event_type,payload)
  select p_business_id,w.id,p_event_type,coalesce(p_payload,'{}'::jsonb)
  from public.webhooks w
  where w.business_id=p_business_id
    and w.is_active=true
    and (
      p_event_type = any(coalesce(w.events,array[]::text[]))
      or '*' = any(coalesce(w.events,array[]::text[]))
    );
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.enqueue_webhook_delivery(uuid,text,jsonb) from public,anon;
grant execute on function public.enqueue_webhook_delivery(uuid,text,jsonb) to authenticated;

-- Delivery queue is server-worker owned. Browsers may not insert/update it.
drop policy if exists webhook_deliveries_member_select on public.webhook_deliveries;
create policy webhook_deliveries_member_select on public.webhook_deliveries
for select to authenticated using (public.is_business_member(business_id));
revoke insert,update,delete on public.webhook_deliveries from anon,authenticated;
grant select on public.webhook_deliveries to authenticated;
