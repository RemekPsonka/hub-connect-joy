-- =====================================================
-- KROK 1: Usunięcie duplikatów RLS (stare polityki bez auth.uid())
-- =====================================================

DROP POLICY IF EXISTS "tenant_access" ON daily_serendipity;
DROP POLICY IF EXISTS "tenant_access" ON notifications;
DROP POLICY IF EXISTS "tenant_access" ON notification_preferences;
DROP POLICY IF EXISTS "tenant_access" ON ai_recommendation_actions;

-- =====================================================
-- KROK 2: Naprawa RLS dla relationship_health
-- =====================================================

DROP POLICY IF EXISTS "tenant_access" ON relationship_health;
DROP POLICY IF EXISTS "Relationship health access" ON relationship_health;

CREATE POLICY "Relationship health tenant access" ON relationship_health
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = relationship_health.contact_id 
      AND c.tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM contacts c 
      WHERE c.id = relationship_health.contact_id 
      AND c.tenant_id = get_current_tenant_id()
    )
  );

-- =====================================================
-- KROK 3: Dodanie brakujących indeksów dla wydajności
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_task_contacts_contact_id 
  ON task_contacts(contact_id);

CREATE INDEX IF NOT EXISTS idx_connections_contact_a 
  ON connections(contact_a_id);

CREATE INDEX IF NOT EXISTS idx_connections_contact_b 
  ON connections(contact_b_id);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant 
  ON notifications(tenant_id);

-- =====================================================
-- KROK 4: Naprawa cross_tasks FK (ON DELETE SET NULL)
-- =====================================================

ALTER TABLE cross_tasks 
  DROP CONSTRAINT IF EXISTS cross_tasks_contact_a_id_fkey;
  
ALTER TABLE cross_tasks 
  ADD CONSTRAINT cross_tasks_contact_a_id_fkey 
  FOREIGN KEY (contact_a_id) REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE cross_tasks 
  DROP CONSTRAINT IF EXISTS cross_tasks_contact_b_id_fkey;
  
ALTER TABLE cross_tasks 
  ADD CONSTRAINT cross_tasks_contact_b_id_fkey 
  FOREIGN KEY (contact_b_id) REFERENCES contacts(id) ON DELETE SET NULL;