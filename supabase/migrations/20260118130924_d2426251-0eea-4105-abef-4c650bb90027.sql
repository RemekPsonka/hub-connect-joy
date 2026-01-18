-- =====================================================
-- USUNIĘCIE ZDUPLIKOWANYCH POLITYK RLS
-- Stare polityki 'tenant_access' bez sprawdzenia auth.uid()
-- =====================================================

-- Tasks & Related
DROP POLICY IF EXISTS "tenant_access" ON tasks;
DROP POLICY IF EXISTS "tenant_access" ON task_contacts;
DROP POLICY IF EXISTS "tenant_access" ON cross_tasks;

-- Meetings & Related
DROP POLICY IF EXISTS "tenant_access" ON group_meetings;
DROP POLICY IF EXISTS "tenant_access" ON meeting_participants;
DROP POLICY IF EXISTS "tenant_access" ON meeting_recommendations;
DROP POLICY IF EXISTS "tenant_access" ON one_on_one_meetings;

-- Connections & Matches
DROP POLICY IF EXISTS "tenant_access" ON connections;
DROP POLICY IF EXISTS "tenant_access" ON matches;