-- Secure account creation and plan-limit enforcement.
-- Paid plan activation must be performed by a trusted billing webhook/service role.

CREATE OR REPLACE FUNCTION public.bootstrap_business_account()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  existing_business_id uuid;
  new_business_id uuid;
  account_email text;
  account_name text;
  base_slug text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT business_id INTO existing_business_id
  FROM public.business_members
  WHERE user_id = auth.uid() AND business_id IS NOT NULL
  ORDER BY created_at ASC LIMIT 1;
  IF existing_business_id IS NOT NULL THEN RETURN existing_business_id; END IF;

  account_email := COALESCE(auth.jwt() ->> 'email', '');
  account_name := COALESCE(NULLIF(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), 'My Business');
  base_slug := trim(both '-' FROM lower(regexp_replace(account_name, '[^a-zA-Z0-9]+', '-', 'g')));
  IF base_slug = '' THEN base_slug := 'my-business'; END IF;

  INSERT INTO public.businesses (name, slug, plan, plan_status)
  VALUES (account_name, base_slug || '-' || substr(replace(auth.uid()::text, '-', ''), 1, 8), 'free', 'trialing')
  RETURNING id INTO new_business_id;
  INSERT INTO public.business_members (business_id, user_id, role, invite_status, email, full_name)
  VALUES (new_business_id, auth.uid(), 'owner', 'accepted', account_email, account_name);
  RETURN new_business_id;
END;
$$;
REVOKE ALL ON FUNCTION public.bootstrap_business_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_business_account() TO authenticated;

-- A browser client cannot attach itself to another business.
DROP POLICY IF EXISTS "select_business_members" ON public.business_members;
CREATE POLICY "select_business_members" ON public.business_members FOR SELECT
  TO authenticated USING (user_id = (select auth.uid()) OR is_business_member(business_id));
DROP POLICY IF EXISTS "insert_business_member" ON public.business_members;
CREATE POLICY "insert_business_member" ON public.business_members FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "update_business_member" ON public.business_members;
CREATE POLICY "update_business_member" ON public.business_members FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_browser_plan_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role')
     AND (NEW.plan IS DISTINCT FROM OLD.plan OR NEW.plan_status IS DISTINCT FROM OLD.plan_status) THEN
    RAISE EXCEPTION 'Subscription changes must be processed by the billing service';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_business_subscription ON public.businesses;
CREATE TRIGGER protect_business_subscription BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_browser_plan_changes();

CREATE OR REPLACE FUNCTION public.enforce_business_plan_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  business_plan text;
  item_count integer;
  item_limit integer;
BEGIN
  SELECT plan INTO business_plan FROM public.businesses WHERE id = NEW.business_id;
  item_limit := CASE TG_TABLE_NAME
    WHEN 'staff' THEN CASE business_plan WHEN 'free' THEN 3 WHEN 'pro' THEN 15 ELSE 2147483647 END
    WHEN 'services' THEN CASE business_plan WHEN 'free' THEN 10 WHEN 'pro' THEN 50 ELSE 2147483647 END
    WHEN 'locations' THEN CASE business_plan WHEN 'free' THEN 1 WHEN 'pro' THEN 3 ELSE 2147483647 END
  END;
  EXECUTE format('SELECT count(*) FROM public.%I WHERE business_id = $1', TG_TABLE_NAME)
    INTO item_count USING NEW.business_id;
  IF item_count >= item_limit THEN
    RAISE EXCEPTION '% plan allows up to % % records', business_plan, item_limit, TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS limit_staff_for_plan ON public.staff;
CREATE TRIGGER limit_staff_for_plan BEFORE INSERT ON public.staff FOR EACH ROW EXECUTE FUNCTION public.enforce_business_plan_limit();
DROP TRIGGER IF EXISTS limit_services_for_plan ON public.services;
CREATE TRIGGER limit_services_for_plan BEFORE INSERT ON public.services FOR EACH ROW EXECUTE FUNCTION public.enforce_business_plan_limit();
DROP TRIGGER IF EXISTS limit_locations_for_plan ON public.locations;
CREATE TRIGGER limit_locations_for_plan BEFORE INSERT ON public.locations FOR EACH ROW EXECUTE FUNCTION public.enforce_business_plan_limit();
