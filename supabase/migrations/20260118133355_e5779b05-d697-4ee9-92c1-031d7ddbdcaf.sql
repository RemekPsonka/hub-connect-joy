-- =====================================================
-- NAPRAWA KRYTYCZNEGO PROBLEMU IZOLACJI MULTI-TENANT
-- =====================================================

-- 1. Napraw trigger handle_new_user - nie twórz tenanta dla zaproszonych użytkowników
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  new_tenant_id uuid;
  user_full_name text;
  invited_tenant_id text;
BEGIN
  -- Sprawdź czy użytkownik jest zaproszony do istniejącego tenanta
  invited_tenant_id := NEW.raw_user_meta_data->>'invited_to_tenant';
  
  IF invited_tenant_id IS NOT NULL THEN
    -- Użytkownik zaproszony - NIE twórz nowego tenanta
    -- Edge function już utworzył wpis w directors
    RETURN NEW;
  END IF;
  
  -- Get full name from metadata or use email
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Create tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (
    user_full_name || '''s Organization',
    lower(replace(user_full_name, ' ', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8)
  )
  RETURNING id INTO new_tenant_id;
  
  -- Create director
  INSERT INTO public.directors (user_id, tenant_id, email, full_name, role)
  VALUES (NEW.id, new_tenant_id, NEW.email, user_full_name, 'owner');
  
  -- Create user_roles entry with owner role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');
  
  -- Also add director role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'director');
  
  RETURN NEW;
END;
$$;

-- 2. Napraw funkcję get_current_tenant_id - wybierz PIERWSZY (najstarszy) tenant
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.directors WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1),
    (SELECT tenant_id FROM public.assistants WHERE user_id = auth.uid() AND is_active = TRUE LIMIT 1)
  )
$$;

-- 3. Usuń zduplikowany wpis testowy z tenanta Remigiusza
DELETE FROM directors 
WHERE user_id = '67bd0ee2-afc7-4cbc-a8e5-0b9ee4b95402' 
  AND tenant_id = 'dd293205-6dc1-438e-ad8e-4fd7cdf8f6e5';

-- 4. Usuń zduplikowany wpis w user_roles
DELETE FROM user_roles 
WHERE user_id = '67bd0ee2-afc7-4cbc-a8e5-0b9ee4b95402' 
  AND tenant_id = 'dd293205-6dc1-438e-ad8e-4fd7cdf8f6e5';

-- 5. Dodaj UNIQUE constraint na directors (user_id, tenant_id) - zapobiega duplikatom
ALTER TABLE directors ADD CONSTRAINT directors_user_tenant_unique UNIQUE (user_id, tenant_id);

-- 6. Dodaj UNIQUE constraint na user_roles (user_id, tenant_id, role) - zapobiega duplikatom
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_tenant_role_unique UNIQUE (user_id, tenant_id, role);