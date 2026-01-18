-- Fix RLS for search_synonyms - remove overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete" ON public.search_synonyms;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.search_synonyms;
DROP POLICY IF EXISTS "Authenticated users can update" ON public.search_synonyms;

-- Create proper policy for directors only
CREATE POLICY "Directors can manage synonyms" ON public.search_synonyms
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.directors WHERE user_id = auth.uid())
);