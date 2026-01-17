-- Fix column ambiguity by using unique internal aliases
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
  -- Expand query with synonyms
  SELECT expand_search_query(p_query) INTO v_expanded_terms;

  -- Build FTS query, filtering out multi-word terms
  SELECT string_agg(t || ':*', ' | ')::tsquery
  INTO v_fts_query
  FROM unnest(v_expanded_terms) AS t
  WHERE t IS NOT NULL
    AND trim(t) != ''
    AND t !~ '\s';

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
    SELECT 
      c.id as item_id,
      'contact'::text as item_type,
      c.full_name as item_title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' @ ' || c.company ELSE '' END as item_subtitle,
      c.profile_summary as item_description,
      ts_rank(c.fts, v_fts_query)::double precision as item_fts_score,
      0::double precision as item_semantic_score
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_types)
      AND c.fts @@ v_fts_query
    
    UNION ALL
    
    SELECT 
      n.id as item_id,
      'need'::text as item_type,
      n.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = n.contact_id) as item_subtitle,
      n.description as item_description,
      ts_rank(n.fts, v_fts_query)::double precision as item_fts_score,
      0::double precision as item_semantic_score
    FROM needs n
    WHERE n.tenant_id = p_tenant_id
      AND 'need' = ANY(p_types)
      AND n.fts @@ v_fts_query
    
    UNION ALL
    
    SELECT 
      o.id as item_id,
      'offer'::text as item_type,
      o.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = o.contact_id) as item_subtitle,
      o.description as item_description,
      ts_rank(o.fts, v_fts_query)::double precision as item_fts_score,
      0::double precision as item_semantic_score
    FROM offers o
    WHERE o.tenant_id = p_tenant_id
      AND 'offer' = ANY(p_types)
      AND o.fts @@ v_fts_query
  ),
  semantic_results AS (
    SELECT 
      c.id as item_id,
      'contact'::text as item_type,
      c.full_name as item_title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' @ ' || c.company ELSE '' END as item_subtitle,
      c.profile_summary as item_description,
      0::double precision as item_fts_score,
      (1 - (c.profile_embedding <=> v_embedding))::double precision as item_semantic_score
    FROM contacts c
    WHERE v_use_semantic
      AND c.tenant_id = p_tenant_id
      AND 'contact' = ANY(p_types)
      AND c.profile_embedding IS NOT NULL
      AND (1 - (c.profile_embedding <=> v_embedding)) > p_threshold
    
    UNION ALL
    
    SELECT 
      n.id as item_id,
      'need'::text as item_type,
      n.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = n.contact_id) as item_subtitle,
      n.description as item_description,
      0::double precision as item_fts_score,
      (1 - (n.embedding <=> v_embedding))::double precision as item_semantic_score
    FROM needs n
    WHERE v_use_semantic
      AND n.tenant_id = p_tenant_id
      AND 'need' = ANY(p_types)
      AND n.embedding IS NOT NULL
      AND (1 - (n.embedding <=> v_embedding)) > p_threshold
    
    UNION ALL
    
    SELECT 
      o.id as item_id,
      'offer'::text as item_type,
      o.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = o.contact_id) as item_subtitle,
      o.description as item_description,
      0::double precision as item_fts_score,
      (1 - (o.embedding <=> v_embedding))::double precision as item_semantic_score
    FROM offers o
    WHERE v_use_semantic
      AND o.tenant_id = p_tenant_id
      AND 'offer' = ANY(p_types)
      AND o.embedding IS NOT NULL
      AND (1 - (o.embedding <=> v_embedding)) > p_threshold
  ),
  combined AS (
    SELECT 
      COALESCE(f.item_id, s.item_id) as item_id,
      COALESCE(f.item_type, s.item_type) as item_type,
      COALESCE(f.item_title, s.item_title) as item_title,
      COALESCE(f.item_subtitle, s.item_subtitle) as item_subtitle,
      COALESCE(f.item_description, s.item_description) as item_description,
      COALESCE(f.item_fts_score, 0) as item_fts_score,
      COALESCE(s.item_semantic_score, 0) as item_semantic_score
    FROM fts_results f
    FULL OUTER JOIN semantic_results s 
      ON f.item_id = s.item_id AND f.item_type = s.item_type
  )
  SELECT 
    cb.item_id,
    cb.item_type,
    cb.item_title,
    cb.item_subtitle,
    cb.item_description,
    cb.item_fts_score,
    cb.item_semantic_score,
    (cb.item_fts_score * p_fts_weight + cb.item_semantic_score * p_semantic_weight)::double precision,
    CASE 
      WHEN cb.item_fts_score > 0 AND cb.item_semantic_score > 0 THEN 'hybrid'
      WHEN cb.item_semantic_score > 0 THEN 'semantic'
      ELSE 'fts'
    END
  FROM combined cb
  WHERE (cb.item_fts_score > 0 OR cb.item_semantic_score > p_threshold)
  ORDER BY (cb.item_fts_score * p_fts_weight + cb.item_semantic_score * p_semantic_weight) DESC
  LIMIT p_limit;
END;
$$;