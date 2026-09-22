-- Public booking RPCs are intentionally anonymous, but signed-in API clients do not need direct execution rights.
REVOKE EXECUTE ON FUNCTION public.create_public_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_available_slots(text, uuid, uuid, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, uuid, uuid, uuid, timestamptz, timestamptz, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, uuid, uuid, date) TO anon;
