-- Fix: Use SECURITY DEFINER helper functions instead of raw subqueries
-- The subqueries in WITH CHECK go through RLS on directors table,
-- which can cause circular evaluation issues.
-- get_current_director_id() and get_current_tenant_id() are SECURITY DEFINER
-- and bypass RLS, so they work reliably.

DROP POLICY IF EXISTS "wc_insert" ON public.wanted_contacts;

CREATE POLICY "wc_insert" ON public.wanted_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND created_by = get_current_director_id()
  );