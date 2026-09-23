-- Production security cleanup for AI functions.
create or replace function public.ai_agent_starter_catalog()
returns jsonb
language sql
immutable
set search_path=public
as $$
  select jsonb_build_array(
    jsonb_build_object('name','Business Copilot','role','business_assistant','capabilities',jsonb_build_array('business_qa','analytics','memory','knowledge')),
    jsonb_build_object('name','Sales Agent','role','sales','capabilities',jsonb_build_array('lead_qualification','crm','follow_up','memory')),
    jsonb_build_object('name','Support Agent','role','support','capabilities',jsonb_build_array('faq','handoff','tickets','knowledge')),
    jsonb_build_object('name','Booking Agent','role','booking','capabilities',jsonb_build_array('availability','booking','reschedule','memory')),
    jsonb_build_object('name','Research Agent','role','research','capabilities',jsonb_build_array('research','summaries','citations'))
  );
$$;

revoke all on function public.ai_agent_starter_catalog() from public;
grant execute on function public.ai_agent_starter_catalog() to authenticated;

revoke all on function public.enforce_ai_ultimate_plan() from public;

revoke execute on function public.ai_business_snapshot(uuid,text) from anon;
revoke execute on function public.ai_runtime_model(uuid,uuid) from anon;
revoke execute on function public.create_ai_action_request(uuid,text,text,uuid,jsonb,text) from anon;
revoke execute on function public.create_public_ai_deployment(uuid,uuid,text,text[]) from anon;
revoke execute on function public.enqueue_ai_knowledge_refresh(uuid,uuid,text) from anon;
revoke execute on function public.promote_ai_improvement_candidate(uuid) from anon;
revoke execute on function public.queue_ai_knowledge_refresh(uuid) from anon;
revoke execute on function public.record_ai_training_run(uuid,text,text,text,numeric) from anon;
revoke execute on function public.rollback_ai_agent_version(uuid) from anon;
revoke execute on function public.rollback_ai_agent_version(uuid) from anon;
revoke execute on function public.rotate_public_ai_deployment_key(uuid) from anon;
revoke execute on function public.set_ai_action_request_decision(uuid,text,text) from anon;
revoke execute on function public.bookora_plan_allows_feature(uuid,text) from anon;
