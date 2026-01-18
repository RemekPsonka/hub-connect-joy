-- =====================================================
-- Dodanie brakujących polityk RLS dla turbo_agent_sessions i turbo_agent_sub_queries
-- =====================================================

-- turbo_agent_sessions - polityka tenant access
CREATE POLICY "Turbo agent sessions tenant access" ON turbo_agent_sessions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND tenant_id = get_current_tenant_id()
  );

-- turbo_agent_sub_queries - polityka przez session_id
CREATE POLICY "Turbo agent sub queries tenant access" ON turbo_agent_sub_queries
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND session_id IN (
      SELECT id FROM turbo_agent_sessions 
      WHERE tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND session_id IN (
      SELECT id FROM turbo_agent_sessions 
      WHERE tenant_id = get_current_tenant_id()
    )
  );