-- =====================================================
-- NAPRAWA 3 POZOSTAŁYCH POLITYK RLS - DODANIE EXPLICIT AUTH CHECKS
-- =====================================================

-- 1. Naprawa polityki na tabeli tenants
DROP POLICY IF EXISTS "tenant_access" ON tenants;

CREATE POLICY "tenant_access" ON tenants
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND id IN (
      SELECT tenant_id FROM directors WHERE user_id = auth.uid()
    )
  );

-- 2. Naprawa polityki na tabeli user_roles
DROP POLICY IF EXISTS "tenant_admin_access" ON user_roles;

CREATE POLICY "tenant_admin_access" ON user_roles
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND is_tenant_admin(auth.uid(), tenant_id)
  );

-- 3. Naprawa polityki na tabeli search_synonyms (zarządzanie)
DROP POLICY IF EXISTS "Directors can manage synonyms" ON search_synonyms;

CREATE POLICY "Directors can manage synonyms" ON search_synonyms
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM directors WHERE user_id = auth.uid()
    )
  );