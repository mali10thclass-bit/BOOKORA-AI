-- BOOKORA AI business OS benchmark layer
-- Inspired by recurring patterns across modern booking, CRM, commerce,
-- field-service, automation, support and analytics products.
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text not null default 'manual',
  stage text not null default 'new',
  score integer not null default 0 check (score between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  value numeric(12,2) not null default 0,
  stage text not null default 'new',
  probability integer not null default 0 check (probability between 0 and 100),
  expected_close_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.business_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  status text not null default 'todo',
  priority text not null default 'normal',
  due_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  related_customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  subject text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  channel text not null default 'web',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  quantity numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.inventory_products(id) on delete cascade,
  quantity_delta numeric(12,2) not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  discount_type text not null default 'percent',
  discount_value numeric(12,2) not null default 0,
  usage_limit integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists coupons_business_code_uidx on public.coupons(business_id, lower(code));
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  initial_balance numeric(12,2) not null default 0,
  remaining_balance numeric(12,2) not null default 0,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists gift_cards_business_code_uidx on public.gift_cards(business_id, code);
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  credits_remaining integer not null default 0
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null default 'web',
  status text not null default 'open',
  subject text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  channel text not null default 'email',
  subject text,
  body text not null,
  variables text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  channel text not null default 'email',
  status text not null default 'draft',
  audience jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'crm_leads','crm_deals','business_tasks','support_tickets','inventory_products',
    'inventory_movements','coupons','gift_cards','memberships','conversations',
    'message_templates','marketing_campaigns'
  ] loop
    execute format('create index if not exists %I on public.%I(business_id)', t || '_business_id_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_member_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_business_member(business_id))', t || '_member_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_business_member(business_id))', t || '_member_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_member_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))', t || '_member_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_member_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_business_member(business_id))', t || '_member_delete', t);
  end loop;
end $$;

create or replace function public.record_inventory_movement(
  p_business_id uuid,
  p_product_id uuid,
  p_quantity_delta numeric,
  p_reason text
) returns public.inventory_products
language plpgsql
security definer
set search_path = public
as $$
declare v_product public.inventory_products;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  if p_quantity_delta = 0 then raise exception 'Quantity delta cannot be zero'; end if;
  update public.inventory_products
  set quantity = quantity + p_quantity_delta
  where id = p_product_id and business_id = p_business_id
  returning * into v_product;
  if not found then raise exception 'Product not found'; end if;
  insert into public.inventory_movements(business_id, product_id, quantity_delta, reason)
  values(p_business_id, p_product_id, p_quantity_delta, left(coalesce(p_reason,'manual'), 200));
  return v_product;
end;
$$;
revoke all on function public.record_inventory_movement(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.record_inventory_movement(uuid,uuid,numeric,text) to authenticated;

create or replace function public.create_business_task(
  p_business_id uuid, p_title text, p_priority text default 'normal', p_due_at timestamptz default null
) returns public.business_tasks
language plpgsql security definer set search_path=public
as $$
declare v public.business_tasks;
begin
  if not public.is_business_member(p_business_id) then raise exception 'Not authorized'; end if;
  if btrim(coalesce(p_title,''))='' then raise exception 'Task title is required'; end if;
  insert into public.business_tasks(business_id,title,priority,due_at)
  values(p_business_id,left(btrim(p_title),200),left(coalesce(p_priority,'normal'),20),p_due_at)
  returning * into v;
  return v;
end; $$;
revoke all on function public.create_business_task(uuid,text,text,timestamptz) from public, anon;
grant execute on function public.create_business_task(uuid,text,text,timestamptz) to authenticated;
