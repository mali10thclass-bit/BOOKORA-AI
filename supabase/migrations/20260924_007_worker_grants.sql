-- BOOKORA AI — worker execution grants
grant execute on function public.claim_automation_run(uuid) to service_role;
grant execute on function public.record_inventory_movement(uuid,uuid,numeric,text) to service_role;
grant execute on function public.create_business_task(uuid,text,text,timestamptz) to service_role;

grant select, insert, update on public.automation_runs to service_role;
grant select on public.automation_workflows to service_role;
grant select, update on public.webhooks to service_role;
grant select, insert, update on public.webhook_deliveries to service_role;
grant select, update on public.ai_knowledge_chunks to service_role;

-- Workers are internal; authenticated users never need direct queue mutation.
revoke insert, update, delete on public.ai_knowledge_chunks from authenticated;
