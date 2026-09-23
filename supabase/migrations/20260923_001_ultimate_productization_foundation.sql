-- BOOKORA AI Ultimate Productization Foundation
-- Adds durable primitives for CRM/AI/automation/resources/waitlist/memberships/forms,
-- auditability, API/webhooks and reputation. Existing tables/RLS remain intact.
-- No destructive changes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enterprise tier support is intentionally additive. Billing still remains service-role only.
CREATE OR REPLACE FUNCTION public.bookora_plan_limits(p_plan text)
RETURNS TABLE (max_staff integer, max_locations integer, max_services integer)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE p_plan WHEN 'ultimate' THEN 2147483647 WHEN 'enterprise' THEN 2147483647 WHEN 'pro' THEN 15 ELSE 3 END,
    CASE p_plan WHEN 'ultimate' THEN 2147483647 WHEN 'enterprise' THEN 2147483647 WHEN 'pro' THEN 3 ELSE 1 END,
    CASE p_plan WHEN 'ultimate' THEN 2147483647 WHEN 'enterprise' THEN 2147483647 WHEN 'pro' THEN 50 ELSE 10 END;
$$;

CREATE OR REPLACE FUNCTION public.bookora_plan_allows_feature(b_id uuid, feature_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_business_member(b_id) THEN false
    WHEN feature_key IN ('dashboard','bookings','customers','services','staff','calendar','public_booking','notifications','settings_basic','crm','forms')
      THEN true
    WHEN feature_key IN ('analytics','csv_export','ai_assistant','ai_trainer','automation','waitlist','packages','memberships','reviews','sms_reminders')
      THEN COALESCE((SELECT plan IN ('pro','ultimate','enterprise') FROM public.businesses WHERE id=b_id), false)
    WHEN feature_key IN ('resources','inventory','pos','api','webhooks','developer_portal','client_portal','website_builder','voice_agent','whatsapp_agent','multi_location_advanced')
      THEN COALESCE((SELECT plan IN ('ultimate','enterprise') FROM public.businesses WHERE id=b_id), false)
    WHEN feature_key IN ('white_label','enterprise_audit','sso')
      THEN COALESCE((SELECT plan='enterprise' FROM public.businesses WHERE id=b_id), false)
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_business_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.plan IS NULL OR NEW.plan NOT IN ('free','pro','ultimate','enterprise') THEN
    RAISE EXCEPTION 'Invalid BOOKORA plan';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan OR NEW.plan_status IS DISTINCT FROM OLD.plan_status THEN
    IF COALESCE(current_setting('request.jwt.claim.role', true),'')='service_role' THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Plan and billing changes must be completed through billing';
  END IF;
  RETURN NEW;
END;
$$;

-- Generic membership guard used by all new product tables.
CREATE OR REPLACE FUNCTION public.bookora_is_admin(b_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id=b_id AND user_id=auth.uid() AND role IN ('owner','admin','manager')
  );
$$;

-- Resources / rooms / equipment.
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'room',
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Intelligent waitlist.
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  preferred_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  preferred_start timestamptz,
  preferred_end timestamptz,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','offered','booked','expired','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Packages / memberships / loyalty foundation.
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  validity_days integer CHECK (validity_days IS NULL OR validity_days > 0),
  credits integer NOT NULL DEFAULT 1 CHECK (credits >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  credits_remaining integer NOT NULL DEFAULT 0 CHECK (credits_remaining >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','paused','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  tier text NOT NULL DEFAULT 'member',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, customer_id)
);

-- Flexible intake/forms.
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- AI knowledge/training/evaluation primitives.
CREATE TABLE IF NOT EXISTS public.ai_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('text','faq','url','document','service','policy','business_data')),
  source_url text,
  content_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','processing','failed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_training_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  knowledge_source_id uuid REFERENCES public.ai_knowledge_sources(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  expected_answer text,
  actual_answer text,
  score numeric(5,2),
  passed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','handoff','resolved','closed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content text NOT NULL,
  tool_name text,
  tool_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Automation builder. Definition is declarative JSON; execution is server-side only.
CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reputation.
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('pending','published','hidden')),
  response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enterprise audit trail.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Developer platform: only hashes are exposed to application clients.
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  endpoint_url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_business ON public.resources(business_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_business_status ON public.waitlist_entries(business_id,status,priority);
CREATE INDEX IF NOT EXISTS idx_memberships_business_customer ON public.customer_memberships(business_id,customer_id);
CREATE INDEX IF NOT EXISTS idx_forms_business ON public.forms(business_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_booking ON public.form_submissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ai_sources_business_status ON public.ai_knowledge_sources(business_id,status);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_business ON public.ai_conversations(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS idx_automation_business_active ON public.automation_workflows(business_id,is_active);
CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow ON public.automation_runs(workflow_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_business_status ON public.reviews(business_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_business_created ON public.audit_logs(business_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_business ON public.api_keys(business_id,revoked_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_business ON public.webhooks(business_id,is_active);

-- RLS: every business-owned record is tenant-scoped. Sensitive developer/audit data
-- requires an admin-level membership.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'resources','waitlist_entries','packages','customer_memberships','loyalty_accounts',
    'forms','form_submissions','ai_knowledge_sources','ai_training_tests',
    'ai_conversations','ai_messages','automation_workflows','automation_runs','reviews'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write ON public.%I FOR ALL TO authenticated USING (public.bookora_is_admin(business_id)) WITH CHECK (public.bookora_is_admin(business_id))', t, t);
  END LOOP;
END $$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (public.bookora_is_admin(business_id));
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.bookora_is_admin(business_id));
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_select ON public.api_keys FOR SELECT TO authenticated USING (public.bookora_is_admin(business_id));
CREATE POLICY api_keys_write ON public.api_keys FOR ALL TO authenticated USING (public.bookora_is_admin(business_id)) WITH CHECK (public.bookora_is_admin(business_id));

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhooks_select ON public.webhooks FOR SELECT TO authenticated USING (public.bookora_is_admin(business_id));
CREATE POLICY webhooks_write ON public.webhooks FOR ALL TO authenticated USING (public.bookora_is_admin(business_id)) WITH CHECK (public.bookora_is_admin(business_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.resources, public.waitlist_entries, public.packages, public.customer_memberships,
  public.loyalty_accounts, public.forms, public.form_submissions, public.ai_knowledge_sources,
  public.ai_training_tests, public.ai_conversations, public.ai_messages,
  public.automation_workflows, public.automation_runs, public.reviews
TO authenticated;

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys, public.webhooks TO authenticated;

REVOKE ALL ON FUNCTION public.bookora_is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bookora_is_admin(uuid) TO authenticated, service_role;

-- Do not expose webhook signing secrets through browser queries.
REVOKE SELECT(secret) ON public.webhooks FROM authenticated;

-- Updated-at helper is already present in the core schema; use it where available.
DROP TRIGGER IF EXISTS trg_resources_updated_at ON public.resources;
CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON public.waitlist_entries;
CREATE TRIGGER trg_waitlist_updated_at BEFORE UPDATE ON public.waitlist_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_forms_updated_at ON public.forms;
CREATE TRIGGER trg_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_ai_sources_updated_at ON public.ai_knowledge_sources;
CREATE TRIGGER trg_ai_sources_updated_at BEFORE UPDATE ON public.ai_knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_automation_updated_at ON public.automation_workflows;
CREATE TRIGGER trg_automation_updated_at BEFORE UPDATE ON public.automation_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER trg_webhooks_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
