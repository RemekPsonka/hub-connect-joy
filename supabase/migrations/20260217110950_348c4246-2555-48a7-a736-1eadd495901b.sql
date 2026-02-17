-- Drop and recreate the insert policy with direct checks instead of helper functions
DROP POLICY IF EXISTS "wc_insert" ON public.wanted_contacts;

CREATE POLICY "wc_insert" ON public.wanted_contacts
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid())
    AND created_by IN (SELECT id FROM public.directors WHERE user_id = auth.uid())
  );