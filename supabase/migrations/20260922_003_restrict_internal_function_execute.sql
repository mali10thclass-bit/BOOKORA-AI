-- Restrict internal SECURITY DEFINER helpers from API roles.
REVOKE ALL ON FUNCTION public.bookora_plan_allows_feature(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bookora_plan_allows_feature(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.public_create_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_create_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.enforce_business_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_staff_plan_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_service_plan_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_location_plan_limit() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;
