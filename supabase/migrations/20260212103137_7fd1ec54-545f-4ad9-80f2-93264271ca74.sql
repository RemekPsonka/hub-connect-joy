
-- Etap 1a: error_logs - ograniczenie INSERT do zalogowanych uzytkownikow
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users insert own errors" ON public.error_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Etap 1b: user_password_policies - ograniczenie INSERT
DROP POLICY IF EXISTS "Service can insert password policy" ON public.user_password_policies;
CREATE POLICY "Users insert own password policy" ON public.user_password_policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
