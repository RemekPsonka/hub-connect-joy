-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'director', 'viewer');

-- Create user_roles table (separate from directors for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'director',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, tenant_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _tenant_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is tenant admin (owner or admin)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('owner', 'admin')
  )
$$;

-- RLS Policy: only tenant admins can manage roles
CREATE POLICY "tenant_admin_access" ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Migrate existing owners from directors table to user_roles
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT user_id, tenant_id, 'owner'::app_role
FROM public.directors
WHERE role = 'owner'
ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

-- Also add director role for all existing directors (they have both roles)
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT user_id, tenant_id, 'director'::app_role
FROM public.directors
ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

-- Update handle_new_user trigger to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  new_director_id uuid;
  user_full_name text;
BEGIN
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
  VALUES (NEW.id, new_tenant_id, NEW.email, user_full_name, 'owner')
  RETURNING id INTO new_director_id;
  
  -- Create user_roles entry with owner role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'owner');
  
  -- Also add director role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'director');
  
  RETURN NEW;
END;
$$;