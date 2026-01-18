-- Najpierw usuwamy ewentualne rekordy z rolą viewer
DELETE FROM public.user_roles WHERE role = 'viewer';

-- Usuwamy default value przed zmianą typu
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- Usuwamy wartość viewer z enum app_role
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'director');

ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role 
  USING role::text::public.app_role;

-- Przywracamy default value
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'director'::public.app_role;

-- Usuwamy starą funkcję has_role która zależy od starego typu
DROP FUNCTION IF EXISTS public.has_role(uuid, uuid, app_role_old);

-- Odtwarzamy funkcję has_role z nowym typem
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _tenant_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
  );
$$;

DROP TYPE public.app_role_old;