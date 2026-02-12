
-- Etap 2: remek_knowledge_base - wymaganie autentykacji dla odczytu
DROP POLICY IF EXISTS "remek_kb_read" ON public.remek_knowledge_base;
CREATE POLICY "remek_kb_read" ON public.remek_knowledge_base
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (is_global = true OR tenant_id = get_current_tenant_id())
  );
