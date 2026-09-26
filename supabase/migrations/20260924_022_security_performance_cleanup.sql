-- BOOKORA AI: security/performance cleanup applied to the live Supabase project.
-- Keep public booking/availability RPCs public by design; tighten internal RLS policies.

drop policy if exists ai_action_requests_decision_member on public.ai_action_requests;

drop policy if exists ai_knowledge_refresh_jobs_member_read on public.ai_knowledge_refresh_jobs;

drop policy if exists ai_action_requests_insert_member on public.ai_action_requests;
create policy ai_action_requests_insert_member
on public.ai_action_requests
for insert to authenticated
with check (
  is_business_member(business_id)
  and actor_user_id = (select auth.uid())
  and status = 'pending'
);

drop policy if exists ai_action_requests_update_member on public.ai_action_requests;
create policy ai_action_requests_update_member
on public.ai_action_requests
for update to authenticated
using (
  is_business_member(business_id)
  and actor_user_id = (select auth.uid())
)
with check (
  is_business_member(business_id)
  and actor_user_id = (select auth.uid())
  and status in ('pending','rejected')
);

drop policy if exists ai_knowledge_refresh_jobs_member on public.ai_knowledge_refresh_jobs;
create policy ai_knowledge_refresh_jobs_member
on public.ai_knowledge_refresh_jobs
for select to authenticated
using (is_business_member(business_id));

drop policy if exists ai_public_rate_limits_no_client_access on public.ai_public_rate_limits;
create policy ai_public_rate_limits_no_client_access
on public.ai_public_rate_limits
for all to anon, authenticated
using (false)
with check (false);
