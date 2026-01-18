-- Polityka pozwalająca użytkownikom sprawdzić własny status superadmina
CREATE POLICY "Users can check own superadmin status" ON superadmins
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );