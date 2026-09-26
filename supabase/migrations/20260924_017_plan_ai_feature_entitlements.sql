-- Server-side plan enforcement for AI capabilities.
create or replace function public.bookora_plan_allows_feature(
  b_id uuid,
  feature_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  current_plan text;
  caller_role text := coalesce(current_setting('request.jwt.claim.role', true),'');
begin
  select plan into current_plan from public.businesses where id=b_id;
  if current_plan is null then return false; end if;
  if caller_role <> 'service_role' and not public.is_business_member(b_id) then return false; end if;

  return case
    when feature_key in ('dashboard','bookings','customers','services','staff','calendar','public_booking','notifications','settings_basic','ai_assistant_basic')
      then true
    when feature_key in ('analytics','csv_export','sms_reminders','ai_assistant','crm_ai','knowledge_rag')
      then current_plan in ('pro','ultimate','enterprise')
    when feature_key in ('ai_agent_studio','ai_agent_operations','public_ai_chat','ai_evolution','ai_generation','advanced_automation','multi_location_advanced','white_label')
      then current_plan in ('ultimate','enterprise')
    else false
  end;
end;
$$;

revoke all on function public.bookora_plan_allows_feature(uuid,text) from public;
grant execute on function public.bookora_plan_allows_feature(uuid,text) to authenticated, service_role;
