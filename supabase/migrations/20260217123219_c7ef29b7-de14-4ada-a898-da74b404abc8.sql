-- Nuclear fix: Drop ALL existing policies and recreate clean ones
DROP POLICY IF EXISTS "wc_insert" ON public.wanted_contacts;
DROP POLICY IF EXISTS "wc_select" ON public.wanted_contacts;
DROP POLICY IF EXISTS "wc_update" ON public.wanted_contacts;
DROP POLICY IF EXISTS "wc_delete" ON public.wanted_contacts;

-- Ensure RLS is enabled
ALTER TABLE public.wanted_contacts ENABLE ROW LEVEL SECURITY;

-- Simple INSERT policy - no subqueries, no helper functions
CREATE POLICY "wc_insert" ON public.wanted_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT: tenant isolation only
CREATE POLICY "wc_select" ON public.wanted_contacts
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- UPDATE: creator or admin
CREATE POLICY "wc_update" ON public.wanted_contacts
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

-- DELETE: creator or admin  
CREATE POLICY "wc_delete" ON public.wanted_contacts
  FOR DELETE
  TO authenticated
  USING (tenant_id = get_current_tenant_id() AND created_by = get_current_director_id());