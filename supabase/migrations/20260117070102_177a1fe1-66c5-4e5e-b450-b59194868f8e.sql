-- ============================================
-- SEARCH SYNONYMS SYSTEM
-- ============================================

-- Tabela synonimów
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  synonyms text[] NOT NULL,
  category text, -- 'branza', 'stanowisko', 'usluga', 'inne'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_search_synonyms_term ON public.search_synonyms(LOWER(term));

-- RLS Policy - public read, authenticated write
ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.search_synonyms 
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert" ON public.search_synonyms 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete" ON public.search_synonyms 
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can update" ON public.search_synonyms 
  FOR UPDATE TO authenticated USING (true);

-- ============================================
-- WSTĘPNE DANE - Branże i kategorie
-- ============================================

INSERT INTO public.search_synonyms (term, synonyms, category) VALUES
  -- Ubezpieczenia
  ('ubezpieczenie', ARRAY['ochrona', 'polisa', 'asekuracja', 'zabezpieczenie', 'insurance'], 'branza'),
  ('ochrona', ARRAY['ubezpieczenie', 'polisa', 'asekuracja', 'bezpieczeństwo'], 'branza'),
  ('polisa', ARRAY['ubezpieczenie', 'ochrona', 'asekuracja'], 'branza'),
  
  -- Finanse
  ('finanse', ARRAY['kredyt', 'pożyczka', 'inwestycje', 'bankowość', 'leasing', 'factoring'], 'branza'),
  ('kredyt', ARRAY['pożyczka', 'finansowanie', 'finanse', 'leasing'], 'branza'),
  ('inwestycje', ARRAY['finanse', 'kapitał', 'funding', 'finansowanie'], 'branza'),
  
  -- HR i Praca
  ('praca', ARRAY['zatrudnienie', 'rekrutacja', 'hr', 'kariera', 'headhunting'], 'branza'),
  ('rekrutacja', ARRAY['hr', 'zatrudnienie', 'headhunting', 'praca'], 'branza'),
  ('hr', ARRAY['rekrutacja', 'kadry', 'praca', 'zatrudnienie'], 'branza'),
  
  -- Marketing
  ('marketing', ARRAY['reklama', 'promocja', 'branding', 'pr', 'social media'], 'branza'),
  ('reklama', ARRAY['marketing', 'promocja', 'advertising'], 'branza'),
  
  -- IT i Technologia
  ('it', ARRAY['technologia', 'informatyka', 'programowanie', 'software', 'systemy', 'tech'], 'branza'),
  ('programowanie', ARRAY['it', 'software', 'development', 'coding', 'dev'], 'branza'),
  ('software', ARRAY['oprogramowanie', 'aplikacje', 'systemy', 'it'], 'branza'),
  
  -- Transport i Logistyka
  ('transport', ARRAY['logistyka', 'spedycja', 'przewóz', 'shipping', 'dostawa'], 'branza'),
  ('logistyka', ARRAY['transport', 'spedycja', 'magazynowanie', 'supply chain'], 'branza'),
  
  -- Energia i Ekologia
  ('energia', ARRAY['oze', 'fotowoltaika', 'energia odnawialna', 'solar', 'prąd'], 'branza'),
  ('pellet', ARRAY['biomasa', 'odpady drewniane', 'paliwo', 'opał', 'trociny', 'zrębki'], 'branza'),
  ('biomasa', ARRAY['pellet', 'odpady drewniane', 'energia odnawialna', 'paliwo'], 'branza'),
  
  -- Nieruchomości
  ('nieruchomości', ARRAY['real estate', 'deweloper', 'mieszkania', 'biura', 'budynki'], 'branza'),
  ('budowa', ARRAY['budownictwo', 'konstrukcja', 'wykonawstwo', 'budynek'], 'branza'),
  
  -- Produkcja
  ('produkcja', ARRAY['wytwarzanie', 'manufacturing', 'fabryka', 'przemysł'], 'branza'),
  
  -- Medycyna i Zdrowie
  ('zdrowie', ARRAY['medycyna', 'opieka zdrowotna', 'healthcare', 'wellness'], 'branza'),
  ('medycyna', ARRAY['zdrowie', 'lekarz', 'healthcare', 'opieka zdrowotna'], 'branza'),
  
  -- Stanowiska
  ('dyrektor', ARRAY['ceo', 'prezes', 'zarząd', 'director', 'szef'], 'stanowisko'),
  ('prezes', ARRAY['dyrektor', 'ceo', 'właściciel', 'zarząd'], 'stanowisko'),
  ('manager', ARRAY['kierownik', 'menedżer', 'szef działu'], 'stanowisko'),
  
  -- Usługi
  ('konsulting', ARRAY['doradztwo', 'consulting', 'advisory', 'doradzanie'], 'usluga'),
  ('szkolenia', ARRAY['training', 'kursy', 'edukacja', 'warsztaty'], 'usluga'),
  ('audyt', ARRAY['kontrola', 'weryfikacja', 'audit', 'przegląd'], 'usluga')
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNKCJA: Rozszerzanie zapytania o synonimy
-- ============================================

CREATE OR REPLACE FUNCTION public.expand_search_query(p_query text)
RETURNS text[] AS $$
DECLARE
  expanded_terms text[];
  synonym_record RECORD;
  query_lower text;
BEGIN
  -- Podstawowy term
  query_lower := LOWER(TRIM(p_query));
  expanded_terms := ARRAY[query_lower];
  
  -- Szukamy synonimów dla podanego termu
  FOR synonym_record IN 
    SELECT synonyms 
    FROM public.search_synonyms 
    WHERE LOWER(term) = query_lower
  LOOP
    -- Dodajemy wszystkie synonimy
    expanded_terms := expanded_terms || synonym_record.synonyms;
  END LOOP;
  
  -- Sprawdzamy też czy query jest synonimem jakiegoś termu
  FOR synonym_record IN
    SELECT term, synonyms
    FROM public.search_synonyms
    WHERE query_lower = ANY(SELECT LOWER(unnest(synonyms)))
  LOOP
    -- Dodajemy główny term
    expanded_terms := array_append(expanded_terms, LOWER(synonym_record.term));
    -- Dodajemy pozostałe synonimy
    expanded_terms := expanded_terms || synonym_record.synonyms;
  END LOOP;
  
  -- Usuń duplikaty i zwróć lowercase
  expanded_terms := ARRAY(SELECT DISTINCT LOWER(unnest(expanded_terms)));
  
  RETURN expanded_terms;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- ZAKTUALIZOWANA FUNKCJA: search_all_fts z synonimami
-- ============================================

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
  
  -- Rozszerz zapytanie o synonimy
  expanded_terms := public.expand_search_query(p_query);
  
  -- Utwórz tsquery z oryginalnego zapytania
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
    ) as similarity
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
    (SELECT contacts_lookup.full_name FROM public.contacts contacts_lookup WHERE contacts_lookup.id = n.contact_id),
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
      OR public.immutable_unaccent(lower(n.search_text)) ILIKE '%' || et || '%'
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
    (SELECT contacts_lookup.full_name FROM public.contacts contacts_lookup WHERE contacts_lookup.id = o.contact_id),
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
      OR public.immutable_unaccent(lower(o.search_text)) ILIKE '%' || et || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(expanded_terms) et 
        WHERE public.immutable_unaccent(lower(o.search_text)) ILIKE '%' || et || '%'
      )
    )
  
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- FUNKCJE POMOCNICZE DLA UI
-- ============================================

-- Pobierz wszystkie synonimy
CREATE OR REPLACE FUNCTION public.get_all_synonyms()
RETURNS TABLE (
  id uuid,
  term text,
  synonyms text[],
  category text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, term, synonyms, category, created_at
  FROM public.search_synonyms
  ORDER BY category NULLS LAST, term;
$$;

-- Dodaj synonim
CREATE OR REPLACE FUNCTION public.add_synonym(
  p_term text,
  p_synonyms text[],
  p_category text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.search_synonyms (term, synonyms, category)
  VALUES (LOWER(TRIM(p_term)), p_synonyms, p_category)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Usuń synonim
CREATE OR REPLACE FUNCTION public.delete_synonym(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.search_synonyms WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- Test rozszerzenia zapytania (dla UI)
CREATE OR REPLACE FUNCTION public.test_expand_query(p_query text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.expand_search_query(p_query);
$$;