-- Najpierw tworzę funkcję SECURITY DEFINER do sprawdzania statusu superadmina
CREATE OR REPLACE FUNCTION public.is_superadmin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.superadmins
    WHERE user_id = check_user_id
  )
$$;

-- Usunięcie rekursyjnej polityki powodującej błąd 500
DROP POLICY IF EXISTS "Superadmins can view superadmins" ON superadmins;

-- Nowa polityka używająca funkcji SECURITY DEFINER (omija RLS)
CREATE POLICY "Superadmins can view all superadmins" ON superadmins
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND public.is_superadmin(auth.uid())
  );