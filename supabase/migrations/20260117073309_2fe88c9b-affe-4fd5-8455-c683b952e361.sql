-- ============================================
-- FIX: Correct the expand_search_query usage in search_all_hybrid
-- The function returns text[] array, not rows
-- ============================================

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
      c.id,
      'contact'::text as type,
      c.full_name as title,
      COALESCE(c.company, '') as subtitle,
      COALESCE(c.profile_summary, c.notes, '') as description,
      ts_rank(c.fts, v_fts_query)::double precision as fts_score,
      0::double precision as semantic_score
    FROM contacts c
    WHERE c.tenant_id = v_tenant
      AND 'contact' = ANY(p_types)
      AND c.fts @@ v_fts_query
    
    UNION ALL
    
    -- Needs FTS
    SELECT 
      n.id,
      'need'::text as type,
      n.title,
      (SELECT full_name FROM contacts WHERE id = n.contact_id) as subtitle,
      COALESCE(n.description, '') as description,
      ts_rank(n.fts, v_fts_query)::double precision as fts_score,
      0::double precision as semantic_score
    FROM needs n
    WHERE n.tenant_id = v_tenant
      AND 'need' = ANY(p_types)
      AND n.fts @@ v_fts_query
    
    UNION ALL
    
    -- Offers FTS
    SELECT 
      o.id,
      'offer'::text as type,
      o.title,
      (SELECT full_name FROM contacts WHERE id = o.contact_id) as subtitle,
      COALESCE(o.description, '') as description,
      ts_rank(o.fts, v_fts_query)::double precision as fts_score,
      0::double precision as semantic_score
    FROM offers o
    WHERE o.tenant_id = v_tenant
      AND 'offer' = ANY(p_types)
      AND o.fts @@ v_fts_query
  ),
  semantic_results AS (
    -- Contacts semantic (only if embedding provided)
    SELECT 
      c.id,
      'contact'::text as type,
      c.full_name as title,
      COALESCE(c.company, '') as subtitle,
      COALESCE(c.profile_summary, c.notes, '') as description,
      0::double precision as fts_score,
      (1 - (c.profile_embedding <=> v_embedding))::double precision as semantic_score
    FROM contacts c
    WHERE v_embedding IS NOT NULL
      AND c.tenant_id = v_tenant
      AND 'contact' = ANY(p_types)
      AND c.profile_embedding IS NOT NULL
      AND (1 - (c.profile_embedding <=> v_embedding)) >= p_threshold
    
    UNION ALL
    
    -- Needs semantic
    SELECT 
      n.id,
      'need'::text as type,
      n.title,
      (SELECT full_name FROM contacts WHERE id = n.contact_id) as subtitle,
      COALESCE(n.description, '') as description,
      0::double precision as fts_score,
      (1 - (n.embedding <=> v_embedding))::double precision as semantic_score
    FROM needs n
    WHERE v_embedding IS NOT NULL
      AND n.tenant_id = v_tenant
      AND 'need' = ANY(p_types)
      AND n.embedding IS NOT NULL
      AND (1 - (n.embedding <=> v_embedding)) >= p_threshold
    
    UNION ALL
    
    -- Offers semantic
    SELECT 
      o.id,
      'offer'::text as type,
      o.title,
      (SELECT full_name FROM contacts WHERE id = o.contact_id) as subtitle,
      COALESCE(o.description, '') as description,
      0::double precision as fts_score,
      (1 - (o.embedding <=> v_embedding))::double precision as semantic_score
    FROM offers o
    WHERE v_embedding IS NOT NULL
      AND o.tenant_id = v_tenant
      AND 'offer' = ANY(p_types)
      AND o.embedding IS NOT NULL
      AND (1 - (o.embedding <=> v_embedding)) >= p_threshold
  ),
  combined AS (
    SELECT 
      r.id,
      r.type,
      r.title,
      r.subtitle,
      r.description,
      MAX(r.fts_score) as fts_score,
      MAX(r.semantic_score) as semantic_score
    FROM (
      SELECT * FROM fts_results
      UNION ALL
      SELECT * FROM semantic_results
    ) r
    GROUP BY r.id, r.type, r.title, r.subtitle, r.description
  )
  SELECT 
    c.id,
    c.type,
    c.title,
    c.subtitle,
    c.description,
    c.fts_score,
    c.semantic_score,
    (c.fts_score * p_fts_weight + c.semantic_score * p_semantic_weight)::double precision as combined_score,
    CASE 
      WHEN c.fts_score > 0 AND c.semantic_score > 0 THEN 'hybrid'
      WHEN c.fts_score > 0 THEN 'fts'
      ELSE 'semantic'
    END as match_source
  FROM combined c
  WHERE c.fts_score > 0 OR c.semantic_score >= p_threshold
  ORDER BY (c.fts_score * p_fts_weight + c.semantic_score * p_semantic_weight) DESC
  LIMIT p_limit;
END;
$$;