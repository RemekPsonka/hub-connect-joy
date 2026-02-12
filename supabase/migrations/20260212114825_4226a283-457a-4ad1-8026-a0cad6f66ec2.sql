
-- Fix 1: error_logs - restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert error logs"
  ON public.error_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 2: remek_knowledge_base - require authentication for SELECT
DROP POLICY IF EXISTS "remek_kb_read" ON public.remek_knowledge_base;
CREATE POLICY "remek_kb_read_authenticated"
  ON public.remek_knowledge_base
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      is_global = true
      OR tenant_id = get_current_tenant_id()
    )
  );

-- Fix 3: search_synonyms - restrict writes to superadmins only
DROP POLICY IF EXISTS "Directors can manage synonyms" ON public.search_synonyms;
CREATE POLICY "Only superadmins can manage synonyms"
  ON public.search_synonyms
  FOR ALL
  USING (is_superadmin())
  WITH CHECK (is_superadmin());
