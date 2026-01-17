-- Hybrid search function combining FTS and semantic search
CREATE OR REPLACE FUNCTION search_all_hybrid(
  p_query text,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_types text[] DEFAULT ARRAY['contact', 'need', 'offer'],
  p_fts_weight float DEFAULT 0.4,
  p_semantic_weight float DEFAULT 0.6,
  p_threshold float DEFAULT 0.2,
  p_limit int DEFAULT 30
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
BEGIN
  -- Expand query with synonyms
  v_expanded_terms := expand_search_query(p_query);
  
  -- Build FTS query from expanded terms
  SELECT string_agg(term || ':*', ' | ')::tsquery 
  INTO v_fts_query
  FROM unnest(v_expanded_terms) AS term
  WHERE term IS NOT NULL AND term != '';
  
  -- If no valid query, use original
  IF v_fts_query IS NULL THEN
    v_fts_query := plainto_tsquery('simple', immutable_unaccent(lower(p_query)));
  END IF;

  RETURN QUERY
  WITH fts_results AS (
    -- FTS search for contacts
    SELECT 
      c.id,
      'contact'::text as type,
      c.full_name as title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' • ' || c.company ELSE '' END as subtitle,
      c.profile_summary as description,
      GREATEST(
        ts_rank(c.fts, v_fts_query),
        similarity(immutable_unaccent(lower(c.full_name)), immutable_unaccent(lower(p_query))),
        similarity(immutable_unaccent(lower(COALESCE(c.company, ''))), immutable_unaccent(lower(p_query)))
      )::double precision as fts_score,
      c.profile_embedding
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_types)
      AND (
        c.fts @@ v_fts_query
        OR similarity(immutable_unaccent(lower(c.full_name)), immutable_unaccent(lower(p_query))) > 0.2
        OR similarity(immutable_unaccent(lower(COALESCE(c.company, ''))), immutable_unaccent(lower(p_query))) > 0.2
      )
    
    UNION ALL
    
    -- FTS search for needs
    SELECT 
      n.id,
      'need'::text as type,
      n.title,
      (SELECT c.full_name FROM contacts c WHERE c.id = n.contact_id) as subtitle,
      n.description,
      GREATEST(
        ts_rank(n.fts, v_fts_query),
        similarity(immutable_unaccent(lower(n.title)), immutable_unaccent(lower(p_query)))
      )::double precision as fts_score,
      n.embedding as profile_embedding
    FROM needs n
    WHERE n.tenant_id = p_tenant_id
      AND 'need' = ANY(p_types)
      AND (
        n.fts @@ v_fts_query
        OR similarity(immutable_unaccent(lower(n.title)), immutable_unaccent(lower(p_query))) > 0.2
      )
    
    UNION ALL
    
    -- FTS search for offers
    SELECT 
      o.id,
      'offer'::text as type,
      o.title,
      (SELECT c.full_name FROM contacts c WHERE c.id = o.contact_id) as subtitle,
      o.description,
      GREATEST(
        ts_rank(o.fts, v_fts_query),
        similarity(immutable_unaccent(lower(o.title)), immutable_unaccent(lower(p_query)))
      )::double precision as fts_score,
      o.embedding as profile_embedding
    FROM offers o
    WHERE o.tenant_id = p_tenant_id
      AND 'offer' = ANY(p_types)
      AND (
        o.fts @@ v_fts_query
        OR similarity(immutable_unaccent(lower(o.title)), immutable_unaccent(lower(p_query))) > 0.2
      )
  ),
  semantic_results AS (
    -- Semantic search for contacts (only if embedding provided)
    SELECT 
      c.id,
      'contact'::text as type,
      c.full_name as title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' • ' || c.company ELSE '' END as subtitle,
      c.profile_summary as description,
      (1 - (c.profile_embedding <=> p_query_embedding))::double precision as semantic_score
    FROM contacts c
    WHERE p_query_embedding IS NOT NULL
      AND c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_types)
      AND c.profile_embedding IS NOT NULL
      AND (1 - (c.profile_embedding <=> p_query_embedding)) > p_threshold
    
    UNION ALL
    
    -- Semantic search for needs
    SELECT 
      n.id,
      'need'::text as type,
      n.title,
      (SELECT c.full_name FROM contacts c WHERE c.id = n.contact_id) as subtitle,
      n.description,
      (1 - (n.embedding <=> p_query_embedding))::double precision as semantic_score
    FROM needs n
    WHERE p_query_embedding IS NOT NULL
      AND n.tenant_id = p_tenant_id
      AND 'need' = ANY(p_types)
      AND n.embedding IS NOT NULL
      AND (1 - (n.embedding <=> p_query_embedding)) > p_threshold
    
    UNION ALL
    
    -- Semantic search for offers
    SELECT 
      o.id,
      'offer'::text as type,
      o.title,
      (SELECT c.full_name FROM contacts c WHERE c.id = o.contact_id) as subtitle,
      o.description,
      (1 - (o.embedding <=> p_query_embedding))::double precision as semantic_score
    FROM offers o
    WHERE p_query_embedding IS NOT NULL
      AND o.tenant_id = p_tenant_id
      AND 'offer' = ANY(p_types)
      AND o.embedding IS NOT NULL
      AND (1 - (o.embedding <=> p_query_embedding)) > p_threshold
  ),
  combined AS (
    SELECT 
      COALESCE(f.id, s.id) as id,
      COALESCE(f.type, s.type) as type,
      COALESCE(f.title, s.title) as title,
      COALESCE(f.subtitle, s.subtitle) as subtitle,
      COALESCE(f.description, s.description) as description,
      COALESCE(f.fts_score, 0)::double precision as fts_score,
      COALESCE(s.semantic_score, 0)::double precision as semantic_score,
      CASE 
        WHEN f.id IS NOT NULL AND s.id IS NOT NULL THEN 'hybrid'
        WHEN f.id IS NOT NULL THEN 'fts'
        ELSE 'semantic'
      END as match_source
    FROM fts_results f
    FULL OUTER JOIN semantic_results s ON f.id = s.id AND f.type = s.type
  )
  SELECT 
    c.id,
    c.type,
    c.title,
    c.subtitle,
    c.description,
    c.fts_score,
    c.semantic_score,
    -- Calculate combined score with weights
    CASE 
      WHEN c.match_source = 'hybrid' THEN 
        (c.fts_score * p_fts_weight) + (c.semantic_score * p_semantic_weight)
      WHEN c.match_source = 'fts' THEN 
        c.fts_score
      ELSE 
        c.semantic_score
    END as combined_score,
    c.match_source
  FROM combined c
  ORDER BY 
    -- Prioritize hybrid matches, then by combined score
    CASE WHEN c.match_source = 'hybrid' THEN 0 ELSE 1 END,
    CASE 
      WHEN c.match_source = 'hybrid' THEN 
        (c.fts_score * p_fts_weight) + (c.semantic_score * p_semantic_weight)
      WHEN c.match_source = 'fts' THEN 
        c.fts_score
      ELSE 
        c.semantic_score
    END DESC
  LIMIT p_limit;
END;
$$;