-- BOOKORA AI — operational productization layer
-- Resource-aware booking, CRM 2.0, form submissions, payment ledger,
-- analytics views, public booking configuration and safe automation primitives.

alter table public.resources
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists capacity integer not null default 1 check (capacity > 0),
  add column if not exists is_bookable boolean not null default true;

create index if not exists resources_business_active_idx
  on public.resources(business_id,is_active,is_bookable);

create table if not exists public.booking_resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(booking_id,resource_id)
);
create index if not exists booking_resources_match_idx
  on public.booking_resources(business_id,resource_id,booking_id);

alter table public.booking_resources enable row level security;
create policy "booking_resources_member_select" on public.booking_resources for select to authenticated
using (public.is_business_member(business_id));
create policy "booking_resources_member_insert" on public.booking_resources for insert to authenticated
with check (public.is_business_member(business_id));
create policy "booking_resources_member_delete" on public.booking_resources for delete to authenticated
using (public.is_business_member(business_id));

create table if not exists public.customer_activity (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  activity_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists customer_activity_timeline_idx
 on public.customer_activity(business_id,customer_id,created_at desc);
alter table public.customer_activity enable row level security;
create policy "customer_activity_member_all" on public.customer_activity for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  form_id uuid not null references public.forms(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  consented_at timestamptz,
  submitted_at timestamptz not null default now()
);
create index if not exists form_submissions_customer_idx
 on public.form_submissions(business_id,customer_id,submitted_at desc);
alter table public.form_submissions enable row level security;
create policy "form_submissions_member_all" on public.form_submissions for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

alter table public.payments
  add column if not exists tip_amount numeric(10,2) not null default 0 check (tip_amount >= 0),
  add column if not exists refunded_amount numeric(10,2) not null default 0 check (refunded_amount >= 0),
  add column if not exists processed_at timestamptz;

create table if not exists public.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  entry_type text not null check (entry_type in ('charge','payment','refund','tip','adjustment')),
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'USD',
  description text,
  created_at timestamptz not null default now()
);
create index if not exists payment_ledger_business_date_idx
 on public.payment_ledger(business_id,created_at desc);
alter table public.payment_ledger enable row level security;
create policy "payment_ledger_member_all" on public.payment_ledger for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

create table if not exists public.public_booking_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default true,
  headline text,
  description text,
  accent_color text,
  show_staff boolean not null default true,
  show_prices boolean not null default true,
  allow_waitlist boolean not null default true,
  allow_guest_booking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.public_booking_settings enable row level security;
create policy "public_booking_settings_member" on public.public_booking_settings for all to authenticated
using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));
create policy "public_booking_settings_public_read" on public.public_booking_settings for select to anon
using (enabled = true);

create or replace function public.get_business_analytics(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
security definer stable
set search_path=public
as $$
  select jsonb_build_object(
    'bookings', (select count(*) from bookings b where b.business_id=p_business_id and b.start_time>=p_from and b.start_time<p_to),
    'completed', (select count(*) from bookings b where b.business_id=p_business_id and b.status='completed' and b.start_time>=p_from and b.start_time<p_to),
    'cancelled', (select count(*) from bookings b where b.business_id=p_business_id and b.status='cancelled' and b.start_time>=p_from and b.start_time<p_to),
    'no_shows', (select count(*) from bookings b where b.business_id=p_business_id and b.status='no_show' and b.start_time>=p_from and b.start_time<p_to),
    'revenue', coalesce((select sum(p.amount) from payments p where p.business_id=p_business_id and p.status in ('paid','partial') and p.created_at>=p_from and p.created_at<p_to),0),
    'customers', (select count(*) from customers c where c.business_id=p_business_id and c.created_at>=p_from and c.created_at<p_to)
  );
$$;
revoke all on function public.get_business_analytics(uuid,timestamptz,timestamptz) from public;
grant execute on function public.get_business_analytics(uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.match_waitlist_for_slot(
  p_business_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
returns table(id uuid,customer_id uuid,priority integer,score integer)
language sql
security definer stable
set search_path=public
as $$
 select w.id,w.customer_id,w.priority,
   (w.priority * 100) +
   case when w.service_id is null or w.service_id=p_service_id then 50 else 0 end as score
 from waitlist_entries w
 where w.business_id=p_business_id
   and w.status='waiting'
   and (w.service_id is null or w.service_id=p_service_id)
   and (w.preferred_start is null or w.preferred_start <= p_start_time)
   and (w.preferred_end is null or w.preferred_end >= p_end_time)
 order by score desc,w.created_at asc
 limit 20;
$$;
revoke all on function public.match_waitlist_for_slot(uuid,uuid,timestamptz,timestamptz) from public;
grant execute on function public.match_waitlist_for_slot(uuid,uuid,timestamptz,timestamptz) to authenticated;

insert into public.public_booking_settings(business_id)
select id from public.businesses
on conflict (business_id) do nothing;
