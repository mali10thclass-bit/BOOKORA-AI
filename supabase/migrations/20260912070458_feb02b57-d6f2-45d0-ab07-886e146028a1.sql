DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['businesses','business_members','locations','services','staff','working_hours','customers','bookings','payments','notifications']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

GRANT SELECT ON public.businesses TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.staff TO anon;
GRANT SELECT ON public.working_hours TO anon;
GRANT SELECT ON public.locations TO anon;
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;