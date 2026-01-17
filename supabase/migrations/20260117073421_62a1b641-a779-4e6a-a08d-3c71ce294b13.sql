-- ============================================
-- FIX: Drop and recreate function with fixed column names
-- ============================================

-- First drop the existing function
DROP FUNCTION IF EXISTS public.search_all_hybrid(text, uuid, text[], text, double precision, integer, double precision, double precision);

-- Recreate with proper aliasing to avoid ambiguity
CREATE OR REPLACE FUNCTION public.search_all_hybrid(
  p_query text,
  p_tenant_id uuid DEFAULT NULL,
  p_types text[] DEFAULT ARRAY['contact', 'need', 'offer'],
  p_query_embedding text DEFAULT NULL,
  p_threshold double precision DEFAULT 0.3,
  p_limit integer DEFAULT 20,
  p_fts_weight double precision DEFAULT 0.4,
  p_semantic_weight double precision DEFAULT 0.6
)
RETURNS TABLE(
  id uuid,
  type text,
  title text,
  subtitle text,
  description text,
  fts_score double precision,
  semantic_score double precision,
  combined_score double precision,
  match_source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expanded_terms text[];
  v_fts_query tsquery;
  v_embedding vector(1536);
  v_tenant uuid;
BEGIN
  -- Get tenant ID
  v_tenant := COALESCE(p_tenant_id, get_current_tenant_id());
  
  -- Expand query with synonyms - returns text[] directly
  v_expanded_terms := expand_search_query(p_query);
  
  -- Build FTS query - FILTER OUT multi-word terms to avoid tsquery errors
  IF v_expanded_terms IS NOT NULL AND array_length(v_expanded_terms, 1) > 0 THEN
    SELECT string_agg(t || ':*', ' | ')::tsquery 
    INTO v_fts_query
    FROM unnest(v_expanded_terms) AS t
    WHERE t IS NOT NULL 
      AND trim(t) != ''
      AND t !~ '\s';  -- Skip terms containing spaces
  END IF;
  
  -- Fallback to original query if no valid FTS query built
  IF v_fts_query IS NULL THEN
    v_fts_query := plainto_tsquery('simple', p_query);
  END IF;
  
  -- Parse embedding if provided
  IF p_query_embedding IS NOT NULL THEN
    v_embedding := p_query_embedding::vector(1536);
  END IF;
  
  RETURN QUERY
  WITH fts_results AS (
    -- Contacts FTS
    SELECT 
      c.id AS item_id,
      'contact'::text AS item_type,
      c.full_name AS item_title,
      COALESCE(c.company, '') AS item_subtitle,
      COALESCE(c.profile_summary, c.notes, '') AS item_description,
      ts_rank(c.fts, v_fts_query)::double precision AS item_fts_score,
      0::double precision AS item_semantic_score
    FROM contacts c
    WHERE c.tenant_id = v_tenant
      AND 'contact' = ANY(p_types)
      AND c.fts @@ v_fts_query
    
    UNION ALL
    
    -- Needs FTS
    SELECT 
      n.id AS item_id,
      'need'::text AS item_type,
      n.title AS item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = n.contact_id) AS item_subtitle,
      COALESCE(n.description, '') AS item_description,
      ts_rank(n.fts, v_fts_query)::double precision AS item_fts_score,
      0::double precision AS item_semantic_score
    FROM needs n
    WHERE n.tenant_id = v_tenant
      AND 'need' = ANY(p_types)
      AND n.fts @@ v_fts_query
    
    UNION ALL
    
    -- Offers FTS
    SELECT 
      o.id AS item_id,
      'offer'::text AS item_type,
      o.title AS item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = o.contact_id) AS item_subtitle,
      COALESCE(o.description, '') AS item_description,
      ts_rank(o.fts, v_fts_query)::double precision AS item_fts_score,
      0::double precision AS item_semantic_score
    FROM offers o
    WHERE o.tenant_id = v_tenant
      AND 'offer' = ANY(p_types)
      AND o.fts @@ v_fts_query
  ),
  semantic_results AS (
    -- Contacts semantic (only if embedding provided)
    SELECT 
      c.id AS item_id,
      'contact'::text AS item_type,
      c.full_name AS item_title,
      COALESCE(c.company, '') AS item_subtitle,
      COALESCE(c.profile_summary, c.notes, '') AS item_description,
      0::double precision AS item_fts_score,
      (1 - (c.profile_embedding <=> v_embedding))::double precision AS item_semantic_score
    FROM contacts c
    WHERE v_embedding IS NOT NULL
      AND c.tenant_id = v_tenant
      AND 'contact' = ANY(p_types)
      AND c.profile_embedding IS NOT NULL
      AND (1 - (c.profile_embedding <=> v_embedding)) >= p_threshold
    
    UNION ALL
    
    -- Needs semantic
    SELECT 
      n.id AS item_id,
      'need'::text AS item_type,
      n.title AS item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = n.contact_id) AS item_subtitle,
      COALESCE(n.description, '') AS item_description,
      0::double precision AS item_fts_score,
      (1 - (n.embedding <=> v_embedding))::double precision AS item_semantic_score
    FROM needs n
    WHERE v_embedding IS NOT NULL
      AND n.tenant_id = v_tenant
      AND 'need' = ANY(p_types)
      AND n.embedding IS NOT NULL
      AND (1 - (n.embedding <=> v_embedding)) >= p_threshold
    
    UNION ALL
    
    -- Offers semantic
    SELECT 
      o.id AS item_id,
      'offer'::text AS item_type,
      o.title AS item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = o.contact_id) AS item_subtitle,
      COALESCE(o.description, '') AS item_description,
      0::double precision AS item_fts_score,
      (1 - (o.embedding <=> v_embedding))::double precision AS item_semantic_score
    FROM offers o
    WHERE v_embedding IS NOT NULL
      AND o.tenant_id = v_tenant
      AND 'offer' = ANY(p_types)
      AND o.embedding IS NOT NULL
      AND (1 - (o.embedding <=> v_embedding)) >= p_threshold
  ),
  combined AS (
    SELECT 
      r.item_id,
      r.item_type,
      r.item_title,
      r.item_subtitle,
      r.item_description,
      MAX(r.item_fts_score) AS max_fts_score,
      MAX(r.item_semantic_score) AS max_semantic_score
    FROM (
      SELECT * FROM fts_results
      UNION ALL
      SELECT * FROM semantic_results
    ) r
    GROUP BY r.item_id, r.item_type, r.item_title, r.item_subtitle, r.item_description
  )
  SELECT 
    cb.item_id,
    cb.item_type,
    cb.item_title,
    cb.item_subtitle,
    cb.item_description,
    cb.max_fts_score,
    cb.max_semantic_score,
    (cb.max_fts_score * p_fts_weight + cb.max_semantic_score * p_semantic_weight)::double precision,
    CASE 
      WHEN cb.max_fts_score > 0 AND cb.max_semantic_score > 0 THEN 'hybrid'
      WHEN cb.max_fts_score > 0 THEN 'fts'
      ELSE 'semantic'
    END
  FROM combined cb
  WHERE cb.max_fts_score > 0 OR cb.max_semantic_score >= p_threshold
  ORDER BY (cb.max_fts_score * p_fts_weight + cb.max_semantic_score * p_semantic_weight) DESC
  LIMIT p_limit;
END;
$$;