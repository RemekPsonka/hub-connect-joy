-- =====================================================
-- DODANIE ROLI GLOBALNEGO SUPERADMINA
-- =====================================================

-- 1. Tabela globalnych superadminów
CREATE TABLE IF NOT EXISTS public.superadmins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. RLS dla superadmins
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

-- Tylko superadmini mogą widzieć tę tabelę
CREATE POLICY "Superadmins can view superadmins" ON superadmins
  FOR SELECT USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() IN (SELECT user_id FROM superadmins)
  );

-- 3. Funkcja sprawdzająca czy użytkownik jest superadminem
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.superadmins WHERE user_id = auth.uid()
  )
$$;

-- 4. Dodaj Remigiusza jako superadmina (user_id z auth.users)
INSERT INTO superadmins (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'remek@nono.pl'
ON CONFLICT (user_id) DO NOTHING;

-- 5. Polityki dla superadmina na tabeli tenants
CREATE POLICY "Superadmin can view all tenants" ON tenants
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_superadmin()
  );

CREATE POLICY "Superadmin can create tenants" ON tenants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND is_superadmin()
  );

CREATE POLICY "Superadmin can delete tenants" ON tenants
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND is_superadmin()
  );

-- 6. Polityki dla superadmina na tabeli directors
CREATE POLICY "Superadmin can view all directors" ON directors
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND is_superadmin()
  );

CREATE POLICY "Superadmin can manage directors" ON directors
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND is_superadmin()
  );