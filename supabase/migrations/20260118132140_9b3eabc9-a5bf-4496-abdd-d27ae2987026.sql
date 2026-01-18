-- =====================================================
-- NAPRAWA BEZPIECZEŃSTWA RLS - Usunięcie 21 starych polityk
-- =====================================================

-- =====================================================
-- KROK 1: Usunięcie starych "tenant_access" bez auth.uid() (8 tabel)
-- =====================================================
DROP POLICY IF EXISTS "tenant_access" ON companies;
DROP POLICY IF EXISTS "tenant_access" ON contact_bi_history;
DROP POLICY IF EXISTS "tenant_access" ON contact_groups;
DROP POLICY IF EXISTS "tenant_access" ON default_positions;
DROP POLICY IF EXISTS "tenant_access" ON master_agent_queries;
DROP POLICY IF EXISTS "tenant_access" ON turbo_agent_sessions;
DROP POLICY IF EXISTS "tenant_access" ON turbo_agent_sub_queries;
DROP POLICY IF EXISTS "tenant_access" ON directors;

-- =====================================================
-- KROK 2: Usunięcie starych "Users can..." polityk (konsultacje)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage consultation_chat_messages" ON consultation_chat_messages;
DROP POLICY IF EXISTS "Users can manage consultation_guests" ON consultation_guests;
DROP POLICY IF EXISTS "Users can manage consultation_meetings" ON consultation_meetings;
DROP POLICY IF EXISTS "Users can view questionnaires in their tenant" ON consultation_questionnaire;
DROP POLICY IF EXISTS "Users can update questionnaires in their tenant" ON consultation_questionnaire;
DROP POLICY IF EXISTS "Users can delete questionnaires in their tenant" ON consultation_questionnaire;
DROP POLICY IF EXISTS "Users can manage consultation_recommendations" ON consultation_recommendations;
DROP POLICY IF EXISTS "Users can manage consultation_thanks" ON consultation_thanks;

-- =====================================================
-- KROK 3: Usunięcie innych starych polityk
-- =====================================================
DROP POLICY IF EXISTS "manage_assistant_groups" ON assistant_group_access;
DROP POLICY IF EXISTS "director_can_manage_own_assistants" ON assistants;
DROP POLICY IF EXISTS "assistant_group_access_view" ON contact_groups;
DROP POLICY IF EXISTS "Users can view merge history for their tenant" ON contact_merge_history;
DROP POLICY IF EXISTS "Users can insert merge history for their tenant" ON contact_merge_history;

-- =====================================================
-- KROK 4: Dodanie bezpiecznej polityki dla contact_merge_history
-- =====================================================
CREATE POLICY "Contact merge history tenant access" ON contact_merge_history
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  );