-- Fix search_all_hybrid to properly handle expand_search_query output
CREATE OR REPLACE FUNCTION search_all_hybrid(
  p_query text,
  p_query_embedding text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_types text[] DEFAULT ARRAY['contact', 'need', 'offer'],
  p_fts_weight double precision DEFAULT 0.4,
  p_semantic_weight double precision DEFAULT 0.6,
  p_threshold double precision DEFAULT 0.2,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
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
  v_use_semantic boolean := false;
BEGIN
  -- Expand query with synonyms - expand_search_query returns text[]
  SELECT expand_search_query(p_query) INTO v_expanded_terms;

  -- Build FTS query, filtering out multi-word terms that break tsquery
  SELECT string_agg(t || ':*', ' | ')::tsquery
  INTO v_fts_query
  FROM unnest(v_expanded_terms) AS t
  WHERE t IS NOT NULL
    AND trim(t) != ''
    AND t !~ '\s';

  -- Fallback to simple query if nothing valid
  IF v_fts_query IS NULL THEN
    v_fts_query := plainto_tsquery('simple', p_query);
  END IF;

  -- Parse embedding if provided
  IF p_query_embedding IS NOT NULL AND trim(p_query_embedding) != '' THEN
    BEGIN
      v_embedding := p_query_embedding::vector(1536);
      v_use_semantic := true;
    EXCEPTION WHEN OTHERS THEN
      v_use_semantic := false;
    END;
  END IF;

  RETURN QUERY
  WITH fts_results AS (
    -- Contacts FTS
    SELECT 
      c.id,
      'contact'::text as type,
      c.full_name as title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' @ ' || c.company ELSE '' END as subtitle,
      c.profile_summary as description,
      ts_rank(c.fts, v_fts_query)::double precision as fts_score,
      0::double precision as semantic_score,
      c.profile_embedding
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_types)
      AND c.fts @@ v_fts_query
    
    UNION ALL
    
    -- Needs FTS
    SELECT 
      n.id,
      'need'::text as type,
      n.title,
      (SELECT full_name FROM contacts WHERE id = n.contact_id) as subtitle,
      n.description,
      ts_rank(n.fts, v_fts_query)::double precision as fts_score,
      0::double precision as semantic_score,
      n.embedding as profile_embedding
    FROM needs n
    WHERE n.tenant_id = p_tenant_id
      AND 'need' = ANY(p_types)
      AND n.fts @@ v_fts_query
    
    UNION ALL
    
    -- Offers FTS
    SELECT 
      o.id,
      'offer'::text as type,
      o.title,
      (SELECT full_name FROM contacts WHERE id = o.contact_id) as subtitle,
      o.description,
      ts_rank(o.fts, v_fts_query)::double precision as fts_score,
      0::double precision as semantic_score,
      o.embedding as profile_embedding
    FROM offers o
    WHERE o.tenant_id = p_tenant_id
      AND 'offer' = ANY(p_types)
      AND o.fts @@ v_fts_query
  ),
  semantic_results AS (
    -- Contacts semantic
    SELECT 
      c.id,
      'contact'::text as type,
      c.full_name as title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' @ ' || c.company ELSE '' END as subtitle,
      c.profile_summary as description,
      0::double precision as fts_score,
      (1 - (c.profile_embedding <=> v_embedding))::double precision as semantic_score,
      c.profile_embedding
    FROM contacts c
    WHERE v_use_semantic
      AND c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_types)
      AND c.profile_embedding IS NOT NULL
      AND (1 - (c.profile_embedding <=> v_embedding)) > p_threshold
    
    UNION ALL
    
    -- Needs semantic
    SELECT 
      n.id,
      'need'::text as type,
      n.title,
      (SELECT full_name FROM contacts WHERE id = n.contact_id) as subtitle,
      n.description,
      0::double precision as fts_score,
      (1 - (n.embedding <=> v_embedding))::double precision as semantic_score,
      n.embedding as profile_embedding
    FROM needs n
    WHERE v_use_semantic
      AND n.tenant_id = p_tenant_id
      AND 'need' = ANY(p_types)
      AND n.embedding IS NOT NULL
      AND (1 - (n.embedding <=> v_embedding)) > p_threshold
    
    UNION ALL
    
    -- Offers semantic
    SELECT 
      o.id,
      'offer'::text as type,
      o.title,
      (SELECT full_name FROM contacts WHERE id = o.contact_id) as subtitle,
      o.description,
      0::double precision as fts_score,
      (1 - (o.embedding <=> v_embedding))::double precision as semantic_score,
      o.embedding as profile_embedding
    FROM offers o
    WHERE v_use_semantic
      AND o.tenant_id = p_tenant_id
      AND 'offer' = ANY(p_types)
      AND o.embedding IS NOT NULL
      AND (1 - (o.embedding <=> v_embedding)) > p_threshold
  ),
  combined AS (
    SELECT 
      COALESCE(f.id, s.id) as id,
      COALESCE(f.type, s.type) as type,
      COALESCE(f.title, s.title) as title,
      COALESCE(f.subtitle, s.subtitle) as subtitle,
      COALESCE(f.description, s.description) as description,
      COALESCE(f.fts_score, 0) as fts_score,
      COALESCE(s.semantic_score, 0) as semantic_score
    FROM fts_results f
    FULL OUTER JOIN semantic_results s 
      ON f.id = s.id AND f.type = s.type
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
      WHEN c.semantic_score > 0 THEN 'semantic'
      ELSE 'fts'
    END as match_source
  FROM combined c
  WHERE (c.fts_score > 0 OR c.semantic_score > p_threshold)
  ORDER BY (c.fts_score * p_fts_weight + c.semantic_score * p_semantic_weight) DESC
  LIMIT p_limit;
END;
$$;