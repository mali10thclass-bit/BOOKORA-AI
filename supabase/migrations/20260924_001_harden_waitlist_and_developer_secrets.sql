-- BOOKORA AI hardening for waitlist + developer secrets
alter table public.waitlist_entries
  alter column service_id drop not null;
alter table public.waitlist_entries
  add column if not exists priority integer not null default 0
  check (priority between 0 and 100);
create index if not exists waitlist_entries_match_idx
  on public.waitlist_entries (business_id, service_id, status, priority desc, created_at);

-- Never expose webhook signing secrets through table SELECT.
drop policy if exists "webhooks_select_member" on public.webhooks;
create policy "webhooks_select_member_safe" on public.webhooks
for select to authenticated
using (false);

create or replace function public.list_webhooks()
returns table (
  id uuid,
  name text,
  endpoint_url text,
  events text[],
  is_active boolean,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select w.id, w.name, w.endpoint_url, w.events, w.is_active, w.created_at
  from public.webhooks w
  where public.is_business_member(w.business_id)
  order by w.created_at desc;
$$;
revoke all on function public.list_webhooks() from public;
grant execute on function public.list_webhooks() to authenticated;

create or replace function public.create_webhook(
  p_business_id uuid,
  p_name text,
  p_endpoint_url text,
  p_events text[] default array['booking.created']::text[]
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_secret text;
  v_id uuid;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Not authorized';
  end if;
  if btrim(coalesce(p_name,'')) = '' or length(p_name) > 120 then
    raise exception 'Invalid webhook name';
  end if;
  if p_endpoint_url !~ '^https?://'
     or length(p_endpoint_url) > 2048 then
    raise exception 'Invalid webhook endpoint';
  end if;
  v_secret := 'wh_' || encode(gen_random_bytes(24), 'hex');
  insert into public.webhooks(business_id,name,endpoint_url,secret,events)
  values(p_business_id,btrim(p_name),btrim(p_endpoint_url),v_secret,
         coalesce(p_events,array['booking.created']::text[]))
  returning id into v_id;
  return jsonb_build_object('id',v_id,'secret',v_secret);
end;
$$;
revoke all on function public.create_webhook(uuid,text,text,text[]) from public;
grant execute on function public.create_webhook(uuid,text,text,text[]) to authenticated;

create or replace function public.create_api_key(
  p_business_id uuid,
  p_name text,
  p_scopes text[] default array['read']::text[],
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_key text;
  v_id uuid;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'Not authorized';
  end if;
  if btrim(coalesce(p_name,'')) = '' or length(p_name) > 120 then
    raise exception 'Invalid API key name';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_scopes,array['read']::text[])) s
    where s not in ('read','write','admin')
  ) then
    raise exception 'Invalid API key scope';
  end if;
  v_key := 'bk_' || encode(gen_random_bytes(24), 'hex');
  insert into public.api_keys(business_id,name,key_prefix,key_hash,scopes,created_by,expires_at)
  values(
    p_business_id,btrim(p_name),left(v_key,11),
    encode(digest(v_key,'sha256'),'hex'),
    coalesce(p_scopes,array['read']::text[]),
    auth.uid(),p_expires_at
  ) returning id into v_id;
  return jsonb_build_object('id',v_id,'key',v_key);
end;
$$;
revoke all on function public.create_api_key(uuid,text,text[],timestamptz) from public;
grant execute on function public.create_api_key(uuid,text,text[],timestamptz) to authenticated;
