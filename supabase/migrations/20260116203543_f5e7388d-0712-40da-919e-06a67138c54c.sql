-- Funkcja wywoływana po utworzeniu użytkownika w auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  user_name text;
  user_email text;
BEGIN
  -- Pobierz dane z metadanych lub email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  user_email := NEW.email;
  
  -- Utwórz tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (user_name, NEW.id::text)
  RETURNING id INTO new_tenant_id;
  
  -- Utwórz director
  INSERT INTO public.directors (tenant_id, user_id, full_name, email, role)
  VALUES (new_tenant_id, NEW.id, user_name, user_email, 'owner');
  
  -- Utwórz domyślne grupy kontaktów
  INSERT INTO public.contact_groups (tenant_id, name, color, is_system, sort_order) VALUES
    (new_tenant_id, 'Moi Członkowie', '#10B981', true, 1),
    (new_tenant_id, 'Członkowie CC', '#6366F1', true, 2),
    (new_tenant_id, 'Poznani na CC', '#F59E0B', true, 3),
    (new_tenant_id, 'Leady', '#EF4444', true, 4),
    (new_tenant_id, 'Pozostali', '#6B7280', true, 5);
  
  RETURN NEW;
END;
$$;

-- Trigger na auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();