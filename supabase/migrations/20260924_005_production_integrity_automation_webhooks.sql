-- BOOKORA AI — production integrity, automation, webhook and AI action execution layer

-- 1) Resource conflict protection. A resource may not be assigned to overlapping active bookings.
create or replace function public.assert_booking_resource_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  select start_time, end_time into v_start, v_end
  from public.bookings
  where id = new.booking_id and business_id = new.business_id
    and status not in ('cancelled','no_show');
  if v_start is null or v_end is null then
    raise exception 'Booking not found or inactive';
  end if;

  if exists (
    select 1
    from public.booking_resources br
    join public.bookings b on b.id = br.booking_id
    where br.business_id = new.business_id
      and br.resource_id = new.resource_id
      and br.booking_id <> new.booking_id
      and b.status not in ('cancelled','no_show')
      and tstzrange(b.start_time, b.end_time, '[)') &&
          tstzrange(v_start, v_end, '[)')
  ) then
    raise exception 'Resource is already booked for this time range';
  end if;
  return new;
end;
$$;

drop trigger if exists booking_resources_conflict_guard on public.booking_resources;
create trigger booking_resources_conflict_guard
before insert or update on public.booking_resources
for each row execute function public.assert_booking_resource_available();

revoke all on function public.assert_booking_resource_available() from public;

-- 2) Inventory: atomic, locked movement with negative-stock protection.
create or replace function public.record_inventory_movement(
  p_business_id uuid,
  p_product_id uuid,
  p_quantity_delta numeric,
  p_reason text
) returns public.inventory_products
language plpgsql
security definer
set search_path = public
as $$
declare v public.inventory_products;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  if p_quantity_delta = 0 then raise exception 'Quantity delta cannot be zero'; end if;

  select * into v
  from public.inventory_products
  where id = p_product_id and business_id = p_business_id
  for update;

  if not found then raise exception 'Product not found'; end if;
  if v.quantity + p_quantity_delta < 0 then raise exception 'Insufficient inventory'; end if;

  update public.inventory_products
  set quantity = quantity + p_quantity_delta
  where id = p_product_id and business_id = p_business_id
  returning * into v;

  insert into public.inventory_movements(business_id, product_id, quantity_delta, reason)
  values(p_business_id, p_product_id, p_quantity_delta, left(coalesce(p_reason,'manual'), 200));
  return v;
end;
$$;
revoke all on function public.record_inventory_movement(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.record_inventory_movement(uuid,uuid,numeric,text) to authenticated;

-- 3) CRM customer timeline: automatically record important booking lifecycle events.
create or replace function public.record_booking_customer_activity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.customer_id is not null then
    insert into public.customer_activity(business_id,customer_id,activity_type,title,body,metadata)
    values(
      new.business_id,
      new.customer_id,
      case when tg_op='INSERT' then 'booking_created' else 'booking_updated' end,
      case when tg_op='INSERT' then 'Booking created' else 'Booking updated' end,
      null,
      jsonb_build_object('booking_id',new.id,'status',new.status,'start_time',new.start_time)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists booking_customer_activity on public.bookings;
create trigger booking_customer_activity
after insert or update of status,start_time,end_time on public.bookings
for each row execute function public.record_booking_customer_activity();

-- 4) Webhook delivery queue with retry/backoff metadata.
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','processing','delivered','failed','dead')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_due_idx
on public.webhook_deliveries(status,next_attempt_at);
alter table public.webhook_deliveries enable row level security;

drop policy if exists webhook_deliveries_member_select on public.webhook_deliveries;
create policy webhook_deliveries_member_select on public.webhook_deliveries
for select to authenticated using (public.is_business_member(business_id));

create or replace function public.enqueue_webhook_delivery(
  p_business_id uuid, p_event_type text, p_payload jsonb
) returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer := 0;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  insert into public.webhook_deliveries(business_id,webhook_id,event_type,payload)
  select p_business_id,w.id,p_event_type,coalesce(p_payload,'{}'::jsonb)
  from public.webhooks w
  where w.business_id=p_business_id and w.is_active=true;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.enqueue_webhook_delivery(uuid,text,jsonb) from public, anon;
grant execute on function public.enqueue_webhook_delivery(uuid,text,jsonb) to authenticated;

-- 5) Automation run claiming. Only one worker can claim a due run.
create or replace function public.claim_automation_run(p_run_id uuid)
returns public.automation_runs
language plpgsql
security definer
set search_path=public
as $$
declare v public.automation_runs;
begin
  select * into v from public.automation_runs ar
  where ar.id=p_run_id
    and ar.status='queued'
  for update skip locked;
  if not found then raise exception 'Automation run is not claimable'; end if;

  update public.automation_runs
  set status='running', started_at=now()
  where id=p_run_id
  returning * into v;
  return v;
end;
$$;
revoke all on function public.claim_automation_run(uuid) from public, anon;
grant execute on function public.claim_automation_run(uuid) to authenticated;

-- 6) AI safe-action execution. Browser can propose/approve, but only this RPC executes.
create or replace function public.execute_ai_action(p_action_id uuid)
returns public.ai_action_requests
language plpgsql
security definer
set search_path=public
as $$
declare
  a public.ai_action_requests;
  allowed boolean;
  task public.business_tasks;
begin
  select * into a from public.ai_action_requests where id=p_action_id for update;
  if not found then raise exception 'AI action not found'; end if;
  if not public.is_business_member(a.business_id) then raise exception 'Not authorized'; end if;
  if a.status <> 'approved' then raise exception 'AI action must be approved'; end if;

  select a.action_type = any(p.allowed_actions)
    into allowed
  from public.ai_agent_policies p
  where p.business_id=a.business_id
  order by p.created_at asc limit 1;

  if coalesce(allowed,false) = false then raise exception 'Action is not allowed by the agent policy'; end if;

  if a.action_type = 'create_task' then
    insert into public.business_tasks(business_id,title,priority,due_at,related_customer_id)
    values(
      a.business_id,
      left(coalesce(a.proposal->>'title','AI task'),200),
      left(coalesce(a.proposal->>'priority','normal'),20),
      nullif(a.proposal->>'due_at','')::timestamptz,
      nullif(a.proposal->>'customer_id','')::uuid
    ) returning * into task;
  elsif a.action_type = 'inventory_adjustment' then
    perform public.record_inventory_movement(
      a.business_id,
      (a.proposal->>'product_id')::uuid,
      (a.proposal->>'quantity_delta')::numeric,
      coalesce(a.proposal->>'reason','AI adjustment')
    );
  else
    raise exception 'Unsupported AI action type';
  end if;

  update public.ai_action_requests
  set status='executed', executed_at=now(), reason='Executed by authorized server action'
  where id=p_action_id
  returning * into a;

  insert into public.enterprise_audit_logs(business_id,actor_user_id,action,metadata)
  values(a.business_id,a.actor_user_id,'ai_action_executed',jsonb_build_object(
    'action_id',a.id,'action_type',a.action_type,'target_type',a.target_type,'target_id',a.target_id
  ));

  return a;
end;
$$;
revoke all on function public.execute_ai_action(uuid) from public, anon;
grant execute on function public.execute_ai_action(uuid) to authenticated;

-- Fix analytics payment parameter ambiguity by using a distinct local parameter name.
create or replace function public.get_business_analytics(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns jsonb
language sql security definer stable set search_path=public
as $$
select jsonb_build_object(
 'bookings',(select count(*) from public.bookings b where b.business_id=p_business_id and b.start_time>=p_from and b.start_time<p_to),
 'completed',(select count(*) from public.bookings b where b.business_id=p_business_id and b.status='completed' and b.start_time>=p_from and b.start_time<p_to),
 'cancelled',(select count(*) from public.bookings b where b.business_id=p_business_id and b.status='cancelled' and b.start_time>=p_from and b.start_time<p_to),
 'no_shows',(select count(*) from public.bookings b where b.business_id=p_business_id and b.status='no_show' and b.start_time>=p_from and b.start_time<p_to),
 'revenue',(select coalesce(sum(pay.amount),0) from public.payments pay where pay.business_id=p_business_id and pay.status in ('paid','partial') and pay.created_at>=p_from and pay.created_at<p_to),
 'customers',(select count(*) from public.customers c where c.business_id=p_business_id and c.created_at>=p_from and c.created_at<p_to)
);
$$;
revoke all on function public.get_business_analytics(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_business_analytics(uuid,timestamptz,timestamptz) to authenticated;

-- 7) Safe lexical fallback for knowledge retrieval while vector indexing is unavailable.
create or replace function public.search_ai_knowledge_text(
  p_business_id uuid,
  p_query text,
  p_match_count integer default 8
) returns table(
  chunk_id uuid,
  source_id uuid,
  content text,
  metadata jsonb,
  rank real
)
language sql
stable
security invoker
set search_path=public
as $$
  select c.id,c.source_id,c.content,c.metadata,
    ts_rank_cd(
      to_tsvector('simple', c.content),
      plainto_tsquery('simple', left(coalesce(p_query,''),500))
    )::real as rank
  from public.ai_knowledge_chunks c
  where c.business_id=p_business_id
    and c.status='indexed'
    and to_tsvector('simple', c.content) @@ plainto_tsquery('simple', left(coalesce(p_query,''),500))
    and public.is_business_member(c.business_id)
  order by rank desc
  limit greatest(1,least(20,p_match_count));
$$;
revoke all on function public.search_ai_knowledge_text(uuid,text,integer) from public;
grant execute on function public.search_ai_knowledge_text(uuid,text,integer) to authenticated;

-- 8) Deterministic server-side chunking for knowledge ingestion.
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
      'indexed'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
exception when others then
  update public.ai_knowledge_chunks
  set status='failed', updated_at=now()
  where source_id=p_source_id;
  raise;
end;
$$;
revoke all on function public.index_ai_knowledge_source(uuid) from public, anon;
grant execute on function public.index_ai_knowledge_source(uuid) to authenticated;
