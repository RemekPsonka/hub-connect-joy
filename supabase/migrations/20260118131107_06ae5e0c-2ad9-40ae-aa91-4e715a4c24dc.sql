-- Dodanie brakującej polityki dla contact_bi_history
DROP POLICY IF EXISTS "Contact BI history access" ON contact_bi_history;
CREATE POLICY "Contact BI history access" ON contact_bi_history
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contact_bi_data cbd 
      WHERE cbd.id = contact_bi_history.contact_bi_id 
      AND cbd.tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contact_bi_data cbd 
      WHERE cbd.id = contact_bi_history.contact_bi_id 
      AND cbd.tenant_id = get_current_tenant_id()
    )
  );