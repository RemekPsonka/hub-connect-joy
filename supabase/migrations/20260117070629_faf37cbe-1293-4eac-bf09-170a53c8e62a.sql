-- Fix search_all_fts function - remove erroneous 'et' variable usage outside subquery context

CREATE OR REPLACE FUNCTION public.search_all_fts(
  p_query text,
  p_tenant_id uuid,
  p_types text[] DEFAULT ARRAY['contact', 'need', 'offer'],
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  subtitle text,
  description text,
  similarity double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_term text;
  expanded_terms text[];
  tsquery_term tsquery;
BEGIN
  search_term := public.immutable_unaccent(lower(trim(p_query)));
  expanded_terms := public.expand_search_query(p_query);
  tsquery_term := plainto_tsquery('simple', search_term);
  
  RETURN QUERY
  -- Contacts
  SELECT 
    c.id,
    'contact'::text as type,
    c.full_name as title,
    c.company as subtitle,
    c.position as description,
    GREATEST(
      COALESCE(ts_rank(c.fts, tsquery_term), 0)::double precision,
      COALESCE(similarity(public.immutable_unaccent(lower(c.search_text)), search_term), 0)::double precision,
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(c.search_text)) ILIKE '%' || et || '%'
      ) THEN 0.6 ELSE 0 END::double precision
    ) as sim
  FROM public.contacts c
  WHERE c.tenant_id = p_tenant_id
    AND 'contact' = ANY(p_types)
    AND (
      c.fts @@ tsquery_term 
      OR public.immutable_unaccent(lower(c.search_text)) % search_term
      OR public.immutable_unaccent(lower(c.search_text)) ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(c.search_text)) ILIKE '%' || et || '%'
      )
    )
  
  UNION ALL
  
  -- Needs
  SELECT 
    n.id,
    'need'::text,
    n.title,
    (SELECT contacts_lookup.full_name FROM public.contacts contacts_lookup 
     WHERE contacts_lookup.id = n.contact_id),
    n.description,
    GREATEST(
      COALESCE(ts_rank(n.fts, tsquery_term), 0)::double precision,
      COALESCE(similarity(public.immutable_unaccent(lower(n.search_text)), search_term), 0)::double precision,
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(n.search_text)) ILIKE '%' || et || '%'
      ) THEN 0.6 ELSE 0 END::double precision
    )
  FROM public.needs n
  WHERE n.tenant_id = p_tenant_id
    AND 'need' = ANY(p_types)
    AND (
      n.fts @@ tsquery_term 
      OR public.immutable_unaccent(lower(n.search_text)) % search_term
      OR public.immutable_unaccent(lower(n.search_text)) ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(n.search_text)) ILIKE '%' || et || '%'
      )
    )
  
  UNION ALL
  
  -- Offers
  SELECT 
    o.id,
    'offer'::text,
    o.title,
    (SELECT contacts_lookup.full_name FROM public.contacts contacts_lookup 
     WHERE contacts_lookup.id = o.contact_id),
    o.description,
    GREATEST(
      COALESCE(ts_rank(o.fts, tsquery_term), 0)::double precision,
      COALESCE(similarity(public.immutable_unaccent(lower(o.search_text)), search_term), 0)::double precision,
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(o.search_text)) ILIKE '%' || et || '%'
      ) THEN 0.6 ELSE 0 END::double precision
    )
  FROM public.offers o
  WHERE o.tenant_id = p_tenant_id
    AND 'offer' = ANY(p_types)
    AND (
      o.fts @@ tsquery_term 
      OR public.immutable_unaccent(lower(o.search_text)) % search_term
      OR public.immutable_unaccent(lower(o.search_text)) ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(o.search_text)) ILIKE '%' || et || '%'
      )
    )
  
  ORDER BY sim DESC
  LIMIT p_limit;
END;
$$;