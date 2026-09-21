-- ============================================================================
-- Secure onboarding bootstrap
-- Creates the first business + owner membership atomically for the
-- authenticated user. The browser never assigns an owner role directly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_business_for_current_user(
  p_name text,
  p_description text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_currency text DEFAULT 'USD',
  p_timezone text DEFAULT 'UTC'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_business public.businesses;
  v_slug text;
  v_base_slug text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(btrim(p_name), '') IS NULL OR length(btrim(p_name)) > 160 THEN
    RAISE EXCEPTION 'A valid business name is required';
  END IF;

  IF p_currency IS NULL OR length(btrim(p_currency)) <> 3 THEN
    RAISE EXCEPTION 'A valid currency is required';
  END IF;

  IF p_timezone IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_timezone_names WHERE name = p_timezone
  ) THEN
    RAISE EXCEPTION 'A valid timezone is required';
  END IF;

  IF EXISTS (SELECT 1 FROM business_members WHERE user_id = v_user) THEN
    RAISE EXCEPTION 'This account already belongs to a business';
  END IF;

  v_base_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug = '' THEN v_base_slug := 'business'; END IF;
  v_slug := left(v_base_slug, 80) || '-' ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  INSERT INTO businesses (
    name, slug, description, phone, email, address,
    currency, timezone, created_by, onboarding_completed
  )
  VALUES (
    btrim(p_name), v_slug, NULLIF(btrim(p_description), ''),
    NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_email), ''),
    NULLIF(btrim(p_address), ''), upper(btrim(p_currency)),
    p_timezone, v_user, true
  )
  RETURNING * INTO v_business;

  INSERT INTO business_members (
    business_id, user_id, email, full_name, role, invite_status
  )
  SELECT
    v_business.id,
    v_user,
    COALESCE(NULLIF(btrim(p_email), ''), u.email),
    NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
    'owner',
    'accepted'
  FROM auth.users u
  WHERE u.id = v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user record not found';
  END IF;

  RETURN to_jsonb(v_business);
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_for_current_user(
  text, text, text, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_for_current_user(
  text, text, text, text, text, text, text
) TO authenticated, service_role;
