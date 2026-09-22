-- PUBLIC inherits EXECUTE on newly created PostgreSQL functions unless explicitly revoked.
-- Keep these public booking endpoints callable only by the anonymous booking flow.
REVOKE EXECUTE ON FUNCTION public.create_public_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_available_slots(text, uuid, uuid, date) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, uuid, uuid, date) TO anon;
