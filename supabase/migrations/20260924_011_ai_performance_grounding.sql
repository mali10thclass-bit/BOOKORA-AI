-- BOOKORA AI performance + grounding helpers.
create or replace function public.ai_business_snapshot(p_business_id uuid, p_question text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'business', jsonb_build_object(
      'name', b.name,
      'currency', b.currency,
      'timezone', b.timezone,
      'plan', b.plan
    ),
    'stats', jsonb_build_object(
      'booking_count', (select count(*) from public.bookings x where x.business_id = p_business_id),
      'customer_count', (select count(*) from public.customers x where x.business_id = p_business_id),
      'service_count', (select count(*) from public.services x where x.business_id = p_business_id and coalesce(x.is_active,true)),
      'staff_count', (select count(*) from public.staff x where x.business_id = p_business_id and coalesce(x.is_active,true)),
      'revenue_paid', coalesce((select sum(x.price) from public.bookings x where x.business_id = p_business_id and x.payment_status = 'paid'),0),
      'outstanding_balance', coalesce((select sum(x.price) from public.bookings x where x.business_id = p_business_id and x.payment_status <> 'paid' and x.status <> 'cancelled'),0)
    ),
    'services', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select name, price, duration_minutes, is_active, category
      from public.services where business_id = p_business_id order by name limit 200
    ) x),'[]'::jsonb),
    'staff', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select name, role, is_active
      from public.staff where business_id = p_business_id order by name limit 200
    ) x),'[]'::jsonb),
    'recent_bookings', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select k.start_time, k.end_time, k.status, k.payment_status, k.price,
             s.name as service, st.name as staff, c.name as customer
      from public.bookings k
      left join public.services s on s.id=k.service_id
      left join public.staff st on st.id=k.staff_id
      left join public.customers c on c.id=k.customer_id
      where k.business_id=p_business_id
      order by k.start_time desc limit 80
    ) x),'[]'::jsonb)
  ) into result
  from public.businesses b
  where b.id=p_business_id;

  return coalesce(result,'{}'::jsonb);
end;
$$;

revoke all on function public.ai_business_snapshot(uuid,text) from public;
grant execute on function public.ai_business_snapshot(uuid,text) to authenticated;
