-- BOOKORA AI ultimate productization data layer
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  type text not null default 'room',
  capacity integer not null default 1 check (capacity > 0),
  location_id uuid null references public.locations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists resources_business_id_idx on public.resources(business_id);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  preferred_start timestamptz null,
  preferred_end timestamptz null,
  status text not null default 'waiting',
  notes text null,
  created_at timestamptz not null default now()
);
create index if not exists waitlist_entries_business_id_idx on public.waitlist_entries(business_id);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text null,
  price numeric(12,2) not null default 0,
  validity_days integer null,
  credits integer not null default 1 check (credits >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists packages_business_id_idx on public.packages(business_id);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text null,
  schema jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists forms_business_id_idx on public.forms(business_id);

create table if not exists public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  source_type text not null default 'text',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_knowledge_sources_business_id_idx on public.ai_knowledge_sources(business_id);

create table if not exists public.ai_training_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prompt text not null,
  expected_answer text null,
  actual_answer text null,
  score numeric(5,2) null,
  created_at timestamptz not null default now()
);
create index if not exists ai_training_runs_business_id_idx on public.ai_training_runs(business_id);

create table if not exists public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text null,
  trigger_type text not null,
  definition jsonb not null default '{"steps":[]}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists automation_workflows_business_id_idx on public.automation_workflows(business_id);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid null references public.customers(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text null,
  body text null,
  source text not null default 'bookora',
  status text not null default 'published',
  created_at timestamptz not null default now()
);
create index if not exists reviews_business_id_idx on public.reviews(business_id);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default array['read']::text[],
  created_by uuid null references auth.users(id) on delete set null,
  revoked_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now()
);
create unique index if not exists api_keys_key_hash_uidx on public.api_keys(key_hash);
create index if not exists api_keys_business_id_idx on public.api_keys(business_id);

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  endpoint_url text not null,
  secret text not null,
  events text[] not null default array['booking.created']::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists webhooks_business_id_idx on public.webhooks(business_id);

create table if not exists public.enterprise_audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  entity_type text null,
  entity_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists enterprise_audit_logs_business_id_idx on public.enterprise_audit_logs(business_id);

alter table public.resources enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.packages enable row level security;
alter table public.forms enable row level security;
alter table public.ai_knowledge_sources enable row level security;
alter table public.ai_training_runs enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_runs enable row level security;
alter table public.reviews enable row level security;
alter table public.api_keys enable row level security;
alter table public.webhooks enable row level security;
alter table public.enterprise_audit_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['resources','waitlist_entries','packages','forms','ai_knowledge_sources','ai_training_runs','automation_workflows','automation_runs','reviews','api_keys','webhooks','enterprise_audit_logs'] loop
    execute format('drop policy if exists "%s_select_member" on public.%I', t, t);
    execute format('create policy "%s_select_member" on public.%I for select to authenticated using (public.is_business_member(business_id))', t, t);
    execute format('drop policy if exists "%s_insert_member" on public.%I', t, t);
    execute format('create policy "%s_insert_member" on public.%I for insert to authenticated with check (public.is_business_member(business_id))', t, t);
    execute format('drop policy if exists "%s_update_member" on public.%I', t, t);
    execute format('create policy "%s_update_member" on public.%I for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))', t, t);
    execute format('drop policy if exists "%s_delete_member" on public.%I', t, t);
    execute format('create policy "%s_delete_member" on public.%I for delete to authenticated using (public.is_business_member(business_id))', t, t);
  end loop;
end $$;

-- Secrets are never readable back from the browser.
drop policy if exists "api_keys_select_member" on public.api_keys;
create policy "api_keys_select_member" on public.api_keys for select to authenticated
using (public.is_business_member(business_id));
