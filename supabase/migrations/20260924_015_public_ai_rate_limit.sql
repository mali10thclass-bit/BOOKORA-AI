-- Durable public-chat rate limiting and safe public deployment helpers.

create table if not exists public.ai_public_rate_limits (
  deployment_id uuid primary key references public.ai_agent_deployments(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_public_rate_limits enable row level security;

create or replace function public.consume_public_ai_rate_limit(
  p_deployment_id uuid,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer;
  v_window timestamptz;
begin
  insert into public.ai_public_rate_limits(deployment_id,window_started_at,request_count,updated_at)
  values(p_deployment_id,now(),1,now())
  on conflict (deployment_id) do update
    set window_started_at=case
      when public.ai_public_rate_limits.window_started_at <= now()-interval '1 minute' then now()
      else public.ai_public_rate_limits.window_started_at
    end,
    request_count=case
      when public.ai_public_rate_limits.window_started_at <= now()-interval '1 minute' then 1
      else public.ai_public_rate_limits.request_count+1
    end,
    updated_at=now()
  returning window_started_at,request_count into v_window,v_count;

  return v_count <= greatest(p_limit,1);
end;
$$;

revoke all on function public.consume_public_ai_rate_limit(uuid,integer) from public;
grant execute on function public.consume_public_ai_rate_limit(uuid,integer) to anon,authenticated;
