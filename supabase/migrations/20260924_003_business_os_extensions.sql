-- BOOKORA Business OS core tables and UI-backed metadata extensions
-- Tenant-scoped tables for CRM, tasks, inventory, support and growth.
-- All access is restricted to authenticated business members.

ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS response text;

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 200),
  source text NOT NULL DEFAULT 'manual' CHECK (char_length(source) <= 100),
  status text NOT NULL DEFAULT 'new' CHECK (char_length(status) <= 50),
  value numeric(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 300),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 200),
  sku text,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level integer NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  unit text NOT NULL DEFAULT 'unit' CHECK (char_length(unit) <= 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, sku)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(subject) <= 300),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  channel text NOT NULL DEFAULT 'internal' CHECK (char_length(channel) <= 50),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 200),
  channel text NOT NULL DEFAULT 'internal' CHECK (char_length(channel) <= 50),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','paused','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_business_created ON public.crm_leads(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_tasks_business_created ON public.business_tasks(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_products_business_created ON public.inventory_products(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_business_created ON public.support_tickets(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_business_created ON public.marketing_campaigns(business_id, created_at DESC);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_leads','business_tasks','inventory_products','support_tickets','marketing_campaigns'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (is_business_member(business_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (is_business_member(business_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (is_business_member(business_id))', t, t);
  END LOOP;
END $$;
