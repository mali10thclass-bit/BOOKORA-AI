ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS insert_business ON public.businesses;
CREATE POLICY insert_business ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS select_own_business ON public.businesses;
CREATE POLICY select_own_business ON public.businesses FOR SELECT TO authenticated
  USING (public.is_business_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS update_own_business ON public.businesses;
CREATE POLICY update_own_business ON public.businesses FOR UPDATE TO authenticated
  USING (public.is_business_member(id) OR created_by = auth.uid())
  WITH CHECK (public.is_business_member(id) OR created_by = auth.uid());