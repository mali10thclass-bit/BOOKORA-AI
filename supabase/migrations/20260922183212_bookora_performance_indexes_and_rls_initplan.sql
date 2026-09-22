-- Performance hardening for BOOKORA-AI
-- Add covering indexes for foreign keys and avoid per-row auth.uid() evaluation in RLS.

create index if not exists idx_bookings_location_id on public.bookings(location_id);
create index if not exists idx_bookings_service_id on public.bookings(service_id);
create index if not exists idx_businesses_created_by on public.businesses(created_by);
create index if not exists idx_locations_business_id on public.locations(business_id);
create index if not exists idx_notifications_booking_id on public.notifications(booking_id);
create index if not exists idx_payments_business_id on public.payments(business_id);
create index if not exists idx_waitlist_customer_id on public.waitlist_entries(customer_id);
create index if not exists idx_waitlist_service_id on public.waitlist_entries(service_id);
create index if not exists idx_waitlist_staff_id on public.waitlist_entries(staff_id);
create index if not exists idx_working_hours_staff_id on public.working_hours(staff_id);

alter policy insert_business_member on public.business_members
with check (
  (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1
      from public.businesses b
      where b.id = business_members.business_id
        and b.created_by = (select auth.uid())
    )
  )
  or (
    is_business_owner_or_admin(business_id)
    and role_rank(role) <= role_rank((
      select m.role
      from public.business_members m
      where m.business_id = business_members.business_id
        and m.user_id = (select auth.uid())
      limit 1
    ))
  )
);
