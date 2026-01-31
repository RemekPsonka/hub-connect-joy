-- =====================================================
-- FAZA 2: Rozszerzenie contact_groups o politykę odświeżania
-- =====================================================

-- Dodanie kolumn do tabeli contact_groups
ALTER TABLE public.contact_groups 
ADD COLUMN IF NOT EXISTS refresh_policy text DEFAULT 'quarterly' 
  CHECK (refresh_policy IN ('monthly', 'quarterly', 'biannual', 'annual', 'never')),
ADD COLUMN IF NOT EXISTS refresh_days integer DEFAULT 90,
ADD COLUMN IF NOT EXISTS include_in_health_stats boolean DEFAULT true;

-- Ustawienie domyślnych wartości refresh_days na podstawie refresh_policy
COMMENT ON COLUMN public.contact_groups.refresh_policy IS 'Polityka odświeżania kontaktu: monthly (30 dni), quarterly (90 dni), biannual (180 dni), annual (365 dni), never (pomijaj)';
COMMENT ON COLUMN public.contact_groups.refresh_days IS 'Liczba dni po których kontakt wymaga odświeżenia';
COMMENT ON COLUMN public.contact_groups.include_in_health_stats IS 'Czy uwzględniać tę grupę w statystykach zdrowia sieci';

-- =====================================================
-- FAZA 4: Tabele dla przedstawicieli handlowych
-- =====================================================

-- Tworzenie tabeli sales_representatives
CREATE TABLE IF NOT EXISTS public.sales_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_director_id uuid REFERENCES public.directors(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role_type text DEFAULT 'sales_rep' CHECK (role_type IN ('sales_rep', 'ambassador')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(email, tenant_id)
);

-- Włączenie RLS dla sales_representatives
ALTER TABLE public.sales_representatives ENABLE ROW LEVEL SECURITY;

-- Tworzenie tabeli representative_contacts (przypisanie kontaktów)
CREATE TABLE IF NOT EXISTS public.representative_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid REFERENCES public.sales_representatives(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES public.directors(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'reclaimed', 'completed')),
  deadline_days integer DEFAULT 14,
  deadline_at date,
  extended_count integer DEFAULT 0,
  notes text,
  completed_at timestamptz,
  UNIQUE(representative_id, contact_id)
);

-- Włączenie RLS dla representative_contacts
ALTER TABLE public.representative_contacts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Funkcje pomocnicze do RLS
-- =====================================================

-- Funkcja sprawdzająca czy użytkownik jest przedstawicielem
CREATE OR REPLACE FUNCTION public.is_sales_representative(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales_representatives
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;

-- Funkcja pobierająca ID przedstawiciela dla user_id
CREATE OR REPLACE FUNCTION public.get_sales_representative_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.sales_representatives
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- Funkcja sprawdzająca czy przedstawiciel ma dostęp do kontaktu
CREATE OR REPLACE FUNCTION public.representative_can_access_contact(_rep_id uuid, _contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.representative_contacts
    WHERE representative_id = _rep_id
      AND contact_id = _contact_id
      AND status = 'active'
  )
$$;

-- =====================================================
-- RLS Policies dla sales_representatives
-- =====================================================

-- Dyrektorzy mogą zarządzać przedstawicielami w swoim tenant
CREATE POLICY "Directors can manage sales_representatives"
ON public.sales_representatives
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_tenant_id()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id = get_current_tenant_id()
);

-- Przedstawiciele widzą swój własny rekord
CREATE POLICY "Sales reps can view own record"
ON public.sales_representatives
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- =====================================================
-- RLS Policies dla representative_contacts
-- =====================================================

-- Dyrektorzy mogą zarządzać przypisaniami w swoim tenant
CREATE POLICY "Directors can manage representative_contacts"
ON public.representative_contacts
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.sales_representatives sr
    WHERE sr.id = representative_contacts.representative_id
    AND sr.tenant_id = get_current_tenant_id()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.sales_representatives sr
    WHERE sr.id = representative_contacts.representative_id
    AND sr.tenant_id = get_current_tenant_id()
  )
);

-- Przedstawiciele widzą swoje przypisania
CREATE POLICY "Sales reps can view own assignments"
ON public.representative_contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND representative_id = get_sales_representative_id(auth.uid())
);

-- Przedstawiciele mogą aktualizować swoje przypisania (status, notes)
CREATE POLICY "Sales reps can update own assignments"
ON public.representative_contacts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND representative_id = get_sales_representative_id(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND representative_id = get_sales_representative_id(auth.uid())
);

-- =====================================================
-- RLS Policy: Przedstawiciele mogą widzieć przypisane kontakty
-- =====================================================

CREATE POLICY "Sales reps can view assigned contacts"
ON public.contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_sales_representative(auth.uid())
  AND representative_can_access_contact(get_sales_representative_id(auth.uid()), contacts.id)
);

-- =====================================================
-- Trigger dla updated_at na sales_representatives
-- =====================================================

CREATE TRIGGER update_sales_representatives_updated_at
BEFORE UPDATE ON public.sales_representatives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();