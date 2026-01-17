-- Improve FTS scoring: add normalization flag and increase multiplier
DROP FUNCTION IF EXISTS search_all_hybrid(text, text, uuid, text[], double precision, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION search_all_hybrid(
  p_query text,
  p_query_embedding text,
  p_tenant_id uuid,
  p_types text[],
  p_fts_weight double precision DEFAULT 0.4,
  p_semantic_weight double precision DEFAULT 0.6,
  p_threshold double precision DEFAULT 0.4,
  p_limit integer DEFAULT 30
)
RETURNS TABLE(
  id uuid, type text, title text, subtitle text, description text,
  fts_score double precision, semantic_score double precision,
  combined_score double precision, match_source text
) AS $$
DECLARE
  v_expanded_terms text[];
  v_fts_query tsquery;
  v_embedding vector(1536);
  v_use_semantic boolean := false;
  v_query_lower text;
BEGIN
  v_query_lower := unaccent(lower(trim(p_query)));
  SELECT expand_search_query(p_query) INTO v_expanded_terms;

  SELECT string_agg(unaccent(t) || ':*', ' | ')::tsquery INTO v_fts_query
  FROM unnest(v_expanded_terms) AS t
  WHERE t IS NOT NULL AND trim(t) != '' AND t !~ '\s';

  IF v_fts_query IS NULL THEN
    v_fts_query := plainto_tsquery('simple', unaccent(p_query));
  END IF;

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
      c.id as item_id, 'contact'::text as item_type, c.full_name as item_title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' @ ' || c.company ELSE '' END as item_subtitle,
      c.profile_summary as item_description,
      -- IMPROVED: ts_rank with flag 32 (normalization) and 100x multiplier
      LEAST(ts_rank(c.fts, v_fts_query, 32) * 100, 1.0)::double precision as item_fts_score,
      0::double precision as item_semantic_score,
      CASE WHEN unaccent(lower(c.full_name)) LIKE '%' || v_query_lower || '%' THEN 0.3 ELSE 0 END::double precision as item_title_boost
    FROM contacts c
    WHERE c.tenant_id = p_tenant_id AND 'contact' = ANY(p_types) AND c.fts @@ v_fts_query
    
    UNION ALL
    
    SELECT n.id as item_id, 'need'::text as item_type, n.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = n.contact_id) as item_subtitle,
      n.description as item_description,
      LEAST(ts_rank(n.fts, v_fts_query, 32) * 100, 1.0)::double precision as item_fts_score,
      0::double precision as item_semantic_score,
      CASE WHEN unaccent(lower(n.title)) LIKE '%' || v_query_lower || '%' THEN 0.3 ELSE 0 END::double precision as item_title_boost
    FROM needs n
    WHERE n.tenant_id = p_tenant_id AND 'need' = ANY(p_types) AND n.fts @@ v_fts_query
    
    UNION ALL
    
    SELECT o.id as item_id, 'offer'::text as item_type, o.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = o.contact_id) as item_subtitle,
      o.description as item_description,
      LEAST(ts_rank(o.fts, v_fts_query, 32) * 100, 1.0)::double precision as item_fts_score,
      0::double precision as item_semantic_score,
      CASE WHEN unaccent(lower(o.title)) LIKE '%' || v_query_lower || '%' THEN 0.3 ELSE 0 END::double precision as item_title_boost
    FROM offers o
    WHERE o.tenant_id = p_tenant_id AND 'offer' = ANY(p_types) AND o.fts @@ v_fts_query
  ),
  semantic_results AS (
    SELECT 
      c.id as item_id, 'contact'::text as item_type, c.full_name as item_title,
      COALESCE(c.position, '') || CASE WHEN c.company IS NOT NULL THEN ' @ ' || c.company ELSE '' END as item_subtitle,
      c.profile_summary as item_description,
      0::double precision as item_fts_score,
      (1 - (c.profile_embedding <=> v_embedding))::double precision as item_semantic_score,
      0::double precision as item_title_boost
    FROM contacts c
    WHERE v_use_semantic AND c.tenant_id = p_tenant_id AND 'contact' = ANY(p_types)
      AND c.profile_embedding IS NOT NULL AND (1 - (c.profile_embedding <=> v_embedding)) > p_threshold
    
    UNION ALL
    
    SELECT n.id as item_id, 'need'::text as item_type, n.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = n.contact_id) as item_subtitle,
      n.description as item_description,
      0::double precision as item_fts_score,
      (1 - (n.embedding <=> v_embedding))::double precision as item_semantic_score,
      0::double precision as item_title_boost
    FROM needs n
    WHERE v_use_semantic AND n.tenant_id = p_tenant_id AND 'need' = ANY(p_types)
      AND n.embedding IS NOT NULL AND (1 - (n.embedding <=> v_embedding)) > p_threshold
    
    UNION ALL
    
    SELECT o.id as item_id, 'offer'::text as item_type, o.title as item_title,
      (SELECT ct.full_name FROM contacts ct WHERE ct.id = o.contact_id) as item_subtitle,
      o.description as item_description,
      0::double precision as item_fts_score,
      (1 - (o.embedding <=> v_embedding))::double precision as item_semantic_score,
      0::double precision as item_title_boost
    FROM offers o
    WHERE v_use_semantic AND o.tenant_id = p_tenant_id AND 'offer' = ANY(p_types)
      AND o.embedding IS NOT NULL AND (1 - (o.embedding <=> v_embedding)) > p_threshold
  ),
  combined AS (
    SELECT 
      COALESCE(f.item_id, s.item_id) as item_id,
      COALESCE(f.item_type, s.item_type) as item_type,
      COALESCE(f.item_title, s.item_title) as item_title,
      COALESCE(f.item_subtitle, s.item_subtitle) as item_subtitle,
      COALESCE(f.item_description, s.item_description) as item_description,
      GREATEST(COALESCE(f.item_fts_score, 0), COALESCE(s.item_fts_score, 0)) as item_fts_score,
      GREATEST(COALESCE(f.item_semantic_score, 0), COALESCE(s.item_semantic_score, 0)) as item_semantic_score,
      GREATEST(COALESCE(f.item_title_boost, 0), COALESCE(s.item_title_boost, 0)) as item_title_boost
    FROM fts_results f
    FULL OUTER JOIN semantic_results s ON f.item_id = s.item_id AND f.item_type = s.item_type
  )
  SELECT cb.item_id, cb.item_type, cb.item_title, cb.item_subtitle, cb.item_description,
    cb.item_fts_score, cb.item_semantic_score,
    LEAST((cb.item_fts_score * p_fts_weight + cb.item_semantic_score * p_semantic_weight + cb.item_title_boost), 1.0)::double precision,
    CASE WHEN cb.item_fts_score > 0 AND cb.item_semantic_score > 0 THEN 'hybrid'
         WHEN cb.item_semantic_score > 0 THEN 'semantic' ELSE 'fts' END
  FROM combined cb
  WHERE (cb.item_fts_score > 0 OR cb.item_semantic_score > p_threshold)
  ORDER BY (cb.item_fts_score * p_fts_weight + cb.item_semantic_score * p_semantic_weight + cb.item_title_boost) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;