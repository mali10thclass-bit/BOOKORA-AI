-- BOOKORA AI plan entitlements
-- Server-side enforcement for Free / Pro / Ultimate.
-- This complements UI gating; direct client/API writes cannot bypass limits.

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

CREATE OR REPLACE FUNCTION public.enforce_business_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.plan IS DISTINCT FROM OLD.plan OR NEW.plan_status IS DISTINCT FROM OLD.plan_status)
     AND NOT public.is_business_owner(OLD.id) THEN
    RAISE EXCEPTION 'Only the business owner can change plan or billing status';
  END IF;

  IF NEW.plan IS NULL OR NEW.plan NOT IN ('free', 'pro', 'ultimate') THEN
    RAISE EXCEPTION 'Invalid BOOKORA plan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_plan_change ON public.businesses;
CREATE TRIGGER trg_enforce_business_plan_change
BEFORE UPDATE OF plan, plan_status ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_business_plan_change();

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

  IF COALESCE(NEW.is_active, true)
     AND NOT EXISTS (SELECT 1 FROM public.staff WHERE id = NEW.id)
     AND (SELECT count(*) FROM public.staff WHERE business_id = NEW.business_id AND COALESCE(is_active, true)) >= max_allowed
  THEN
    RAISE EXCEPTION 'Your % plan allows up to % active staff members. Upgrade your plan to add more.', COALESCE(current_plan, 'free'), max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_plan_limit ON public.staff;
CREATE TRIGGER trg_enforce_staff_plan_limit
BEFORE INSERT ON public.staff
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
BEGIN
  SELECT plan INTO current_plan FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  SELECT max_services INTO max_allowed FROM public.bookora_plan_limits(COALESCE(current_plan, 'free'));

  IF COALESCE(NEW.is_active, true)
     AND NOT EXISTS (SELECT 1 FROM public.services WHERE id = NEW.id)
     AND (SELECT count(*) FROM public.services WHERE business_id = NEW.business_id AND COALESCE(is_active, true)) >= max_allowed
  THEN
    RAISE EXCEPTION 'Your % plan allows up to % active services. Upgrade your plan to add more.', COALESCE(current_plan, 'free'), max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_service_plan_limit ON public.services;
CREATE TRIGGER trg_enforce_service_plan_limit
BEFORE INSERT ON public.services
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
BEGIN
  SELECT plan INTO current_plan FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  SELECT max_locations INTO max_allowed FROM public.bookora_plan_limits(COALESCE(current_plan, 'free'));

  IF COALESCE(NEW.is_active, true)
     AND NOT EXISTS (SELECT 1 FROM public.locations WHERE id = NEW.id)
     AND (SELECT count(*) FROM public.locations WHERE business_id = NEW.business_id AND COALESCE(is_active, true)) >= max_allowed
  THEN
    RAISE EXCEPTION 'Your % plan allows up to % active locations. Upgrade your plan to add more.', COALESCE(current_plan, 'free'), max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_location_plan_limit ON public.locations;
CREATE TRIGGER trg_enforce_location_plan_limit
BEFORE INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_location_plan_limit();

REVOKE ALL ON FUNCTION public.enforce_business_plan_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_staff_plan_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_service_plan_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_location_plan_limit() FROM PUBLIC;
