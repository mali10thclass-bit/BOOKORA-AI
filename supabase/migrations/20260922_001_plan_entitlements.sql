-- BOOKORA AI plan entitlements
-- Server-side enforcement for Free / Pro / Ultimate.
-- Direct browser/API writes cannot bypass limits or paid-plan activation rules.

CREATE OR REPLACE FUNCTION public.bookora_plan_limits(p_plan text)
RETURNS TABLE (
  max_staff integer,
  max_locations integer,
  max_services integer
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE p_plan
      WHEN 'ultimate' THEN 2147483647
      WHEN 'pro' THEN 15
      ELSE 3
    END,
    CASE p_plan
      WHEN 'ultimate' THEN 2147483647
      WHEN 'pro' THEN 3
      ELSE 1
    END,
    CASE p_plan
      WHEN 'ultimate' THEN 2147483647
      WHEN 'pro' THEN 50
      ELSE 10
    END;
$$;

CREATE OR REPLACE FUNCTION public.bookora_plan_allows_feature(
  b_id uuid,
  feature_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.is_business_member(b_id) THEN false
    WHEN feature_key IN ('dashboard', 'bookings', 'customers', 'services', 'staff', 'calendar', 'public_booking', 'notifications', 'settings_basic')
      THEN true
    WHEN feature_key IN ('analytics', 'csv_export', 'ai_assistant', 'sms_reminders')
      THEN COALESCE((SELECT plan IN ('pro', 'ultimate') FROM public.businesses WHERE id = b_id), false)
    WHEN feature_key IN ('white_label', 'advanced_automation', 'priority_support', 'multi_location_advanced')
      THEN COALESCE((SELECT plan = 'ultimate' FROM public.businesses WHERE id = b_id), false)
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.bookora_plan_limits(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookora_plan_limits(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.bookora_plan_allows_feature(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bookora_plan_allows_feature(uuid, text) TO authenticated, service_role;

-- Paid plan/billing state must never be changed directly by a browser owner.
-- A future billing webhook/background job may use service_role to update it.
CREATE OR REPLACE FUNCTION public.enforce_business_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IS NULL OR NEW.plan NOT IN ('free', 'pro', 'ultimate') THEN
    RAISE EXCEPTION 'Invalid BOOKORA plan';
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan OR NEW.plan_status IS DISTINCT FROM OLD.plan_status THEN
    IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Plan and billing changes must be completed through billing';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_plan_change ON public.businesses;
CREATE TRIGGER trg_enforce_business_plan_change
BEFORE UPDATE OF plan, plan_status ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_business_plan_change();

-- The following limit triggers lock the business row before counting, making
-- concurrent inserts serialize for a business and preventing race-based bypasses.
CREATE OR REPLACE FUNCTION public.enforce_staff_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan text;
  max_allowed integer;
  current_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  SELECT max_staff INTO max_allowed FROM public.bookora_plan_limits(COALESCE(current_plan, 'free'));

  IF COALESCE(NEW.is_active, true) THEN
    SELECT count(*) INTO current_count
    FROM public.staff
    WHERE business_id = NEW.business_id
      AND COALESCE(is_active, true)
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Your % plan allows up to % active staff members. Upgrade your plan to add more.', COALESCE(current_plan, 'free'), max_allowed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_plan_limit ON public.staff;
CREATE TRIGGER trg_enforce_staff_plan_limit
BEFORE INSERT OR UPDATE OF business_id, is_active ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.enforce_staff_plan_limit();

CREATE OR REPLACE FUNCTION public.enforce_service_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan text;
  max_allowed integer;
  current_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  SELECT max_services INTO max_allowed FROM public.bookora_plan_limits(COALESCE(current_plan, 'free'));

  IF COALESCE(NEW.is_active, true) THEN
    SELECT count(*) INTO current_count
    FROM public.services
    WHERE business_id = NEW.business_id
      AND COALESCE(is_active, true)
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Your % plan allows up to % active services. Upgrade your plan to add more.', COALESCE(current_plan, 'free'), max_allowed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_service_plan_limit ON public.services;
CREATE TRIGGER trg_enforce_service_plan_limit
BEFORE INSERT OR UPDATE OF business_id, is_active ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.enforce_service_plan_limit();

CREATE OR REPLACE FUNCTION public.enforce_location_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan text;
  max_allowed integer;
  current_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  SELECT max_locations INTO max_allowed FROM public.bookora_plan_limits(COALESCE(current_plan, 'free'));

  IF COALESCE(NEW.is_active, true) THEN
    SELECT count(*) INTO current_count
    FROM public.locations
    WHERE business_id = NEW.business_id
      AND COALESCE(is_active, true)
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Your % plan allows up to % active locations. Upgrade your plan to add more.', COALESCE(current_plan, 'free'), max_allowed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_location_plan_limit ON public.locations;
CREATE TRIGGER trg_enforce_location_plan_limit
BEFORE INSERT OR UPDATE OF business_id, is_active ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_location_plan_limit();

REVOKE ALL ON FUNCTION public.enforce_business_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_staff_plan_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_service_plan_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_location_plan_limit() FROM PUBLIC, anon, authenticated;


-- Harden SECURITY DEFINER helpers against search_path and role confusion.
-- Explicitly grant only the roles that need these helpers.
ALTER FUNCTION public.bookora_plan_limits(text) SET search_path = public;
ALTER FUNCTION public.bookora_plan_allows_feature(uuid, text) SET search_path = public;
ALTER FUNCTION public.enforce_business_plan_change() SET search_path = public;
ALTER FUNCTION public.enforce_staff_plan_limit() SET search_path = public;
ALTER FUNCTION public.enforce_service_plan_limit() SET search_path = public;
ALTER FUNCTION public.enforce_location_plan_limit() SET search_path = public;

-- PostgreSQL's request.jwt.claim.role is populated by Supabase's JWT layer;
-- keep the billing exception narrowly scoped to service_role.


-- Internal SECURITY DEFINER helpers are not API endpoints.
REVOKE ALL ON FUNCTION public.public_create_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_create_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;
