-- BOOKORA AI — event-driven automation and webhook enqueue triggers

create or replace function public.enqueue_webhook_delivery_internal(
  p_business_id uuid,p_event_type text,p_payload jsonb
) returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer := 0;
begin
  insert into public.webhook_deliveries(business_id,webhook_id,event_type,payload)
  select p_business_id,w.id,p_event_type,coalesce(p_payload,'{}'::jsonb)
  from public.webhooks w
  where w.business_id=p_business_id
    and w.is_active=true
    and (
      p_event_type=any(coalesce(w.events,array[]::text[]))
      or '*'=any(coalesce(w.events,array[]::text[]))
    );
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.enqueue_webhook_delivery_internal(uuid,text,jsonb) from public,anon,authenticated,service_role;

create or replace function public.enqueue_automation_run_internal(
  p_business_id uuid,p_trigger_type text,p_input jsonb
) returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer := 0;
begin
  insert into public.automation_runs(workflow_id,business_id,status,input)
  select w.id,p_business_id,'queued',coalesce(p_input,'{}'::jsonb)
  from public.automation_workflows w
  where w.business_id=p_business_id
    and w.is_active=true
    and w.trigger_type=p_trigger_type;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.enqueue_automation_run_internal(uuid,text,jsonb) from public,anon,authenticated,service_role;

create or replace function public.booking_event_dispatch()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_event text;
begin
  v_event := case
    when tg_op='INSERT' then 'booking.created'
    when old.status is distinct from new.status then 'booking.status_changed'
    else 'booking.updated'
  end;

  perform public.enqueue_webhook_delivery_internal(
    new.business_id,
    v_event,
    jsonb_build_object(
      'booking_id',new.id,
      'customer_id',new.customer_id,
      'service_id',new.service_id,
      'staff_id',new.staff_id,
      'location_id',new.location_id,
      'status',new.status,
      'start_time',new.start_time,
      'end_time',new.end_time,
      'price',new.price,
      'payment_status',new.payment_status
    )
  );

  perform public.enqueue_automation_run_internal(
    new.business_id,
    v_event,
    jsonb_build_object('booking_id',new.id,'status',new.status,'start_time',new.start_time)
  );

  return new;
end;
$$;

drop trigger if exists booking_event_dispatch on public.bookings;
create trigger booking_event_dispatch
after insert or update of status,start_time,end_time,payment_status on public.bookings
for each row execute function public.booking_event_dispatch();

-- Automation runs are system-owned; browser clients only read them.
revoke insert,update,delete on public.automation_runs from anon,authenticated;
grant select on public.automation_runs to authenticated;
