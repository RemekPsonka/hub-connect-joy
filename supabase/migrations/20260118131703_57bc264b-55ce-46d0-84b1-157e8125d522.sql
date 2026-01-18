-- =====================================================
-- KROK 1: Usunięcie duplikatów RLS (stare polityki bez auth.uid())
-- =====================================================

-- contact_agent_memory
DROP POLICY IF EXISTS "tenant_access" ON contact_agent_memory;

-- agent_conversations (3 stare polityki)
DROP POLICY IF EXISTS "Users can delete agent conversations for their tenant" ON agent_conversations;
DROP POLICY IF EXISTS "Users can insert agent conversations for their tenant" ON agent_conversations;
DROP POLICY IF EXISTS "Users can view agent conversations for their tenant" ON agent_conversations;

-- master_agent_memory
DROP POLICY IF EXISTS "tenant_access" ON master_agent_memory;

-- contact_bi_data
DROP POLICY IF EXISTS "tenant_access" ON contact_bi_data;

-- bi_interview_sessions
DROP POLICY IF EXISTS "tenant_access" ON bi_interview_sessions;

-- =====================================================
-- KROK 2: Dodanie brakującego FK dla bi_interview_sessions
-- =====================================================

ALTER TABLE bi_interview_sessions 
  DROP CONSTRAINT IF EXISTS bi_interview_sessions_contact_bi_id_fkey;

ALTER TABLE bi_interview_sessions 
  ADD CONSTRAINT bi_interview_sessions_contact_bi_id_fkey 
  FOREIGN KEY (contact_bi_id) REFERENCES contact_bi_data(id) ON DELETE CASCADE;

-- =====================================================
-- KROK 3: Naprawa FK dla contact_bi_data.tenant_id (CASCADE)
-- =====================================================

ALTER TABLE contact_bi_data 
  DROP CONSTRAINT IF EXISTS contact_bi_data_tenant_id_fkey;

ALTER TABLE contact_bi_data 
  ADD CONSTRAINT contact_bi_data_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- =====================================================
-- KROK 4: Dodanie UNIQUE constraint dla master_agent_memory
-- =====================================================

ALTER TABLE master_agent_memory
  DROP CONSTRAINT IF EXISTS unique_master_agent_tenant;

ALTER TABLE master_agent_memory
  ADD CONSTRAINT unique_master_agent_tenant UNIQUE (tenant_id);

-- =====================================================
-- KROK 5: Naprawa contact_bi_data.contact_id na NOT NULL
-- =====================================================

-- Najpierw usuń rekordy bez contact_id (jeśli istnieją)
DELETE FROM contact_bi_data WHERE contact_id IS NULL;

-- Ustaw NOT NULL
ALTER TABLE contact_bi_data 
  ALTER COLUMN contact_id SET NOT NULL;