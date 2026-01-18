-- =====================================================
-- NAPRAWY BEZPIECZEŃSTWA RLS
-- =====================================================

-- 1. Contacts - wzmocnienie polityki tenant_access
DROP POLICY IF EXISTS "tenant_access" ON contacts;
CREATE POLICY "tenant_access" ON contacts
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  );

-- 2. Needs - wzmocnienie polityki tenant_access
DROP POLICY IF EXISTS "tenant_access" ON needs;
CREATE POLICY "tenant_access" ON needs
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = needs.contact_id 
      AND c.tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = needs.contact_id 
      AND c.tenant_id = get_current_tenant_id()
    )
  );

-- 3. Offers - wzmocnienie polityki tenant_access
DROP POLICY IF EXISTS "tenant_access" ON offers;
CREATE POLICY "tenant_access" ON offers
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = offers.contact_id 
      AND c.tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = offers.contact_id 
      AND c.tenant_id = get_current_tenant_id()
    )
  );

-- 4. Consultations - wzmocnienie polityki tenant_access
DROP POLICY IF EXISTS "tenant_access" ON consultations;
CREATE POLICY "tenant_access" ON consultations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  );

-- =====================================================
-- BRAKUJĄCE INDEKSY
-- =====================================================

-- 5. Index na consultations.contact_id (przyspieszenie JOIN z contacts)
CREATE INDEX IF NOT EXISTS idx_consultations_contact_id 
  ON consultations(contact_id);

-- 6. Index na consultations.tenant_id (przyspieszenie filtrowania po tenant)
CREATE INDEX IF NOT EXISTS idx_consultations_tenant_id 
  ON consultations(tenant_id);