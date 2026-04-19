
-- ===== SGU-09: Representative profiles + lifecycle =====
-- TODO REMEK MANUAL: po deploy ustaw w Authentication → Email Templates → "Invite user":
--   Subject: "Zostałeś zaproszony do SGU — ustaw hasło"
--   W Authentication → URL Configuration → Additional Redirect URLs dodaj: <SITE_URL>/setup-sgu

CREATE TABLE IF NOT EXISTS public.sgu_representative_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.deal_teams(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  region text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  onboarded_at timestamptz,
  deactivated_at timestamptz,
  deactivated_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srp_tenant_active ON public.sgu_representative_profiles(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_srp_team_active ON public.sgu_representative_profiles(team_id, active);
CREATE INDEX IF NOT EXISTS idx_srp_user ON public.sgu_representative_profiles(user_id);

DROP TRIGGER IF EXISTS trg_srp_updated_at ON public.sgu_representative_profiles;
CREATE TRIGGER trg_srp_updated_at
  BEFORE UPDATE ON public.sgu_representative_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sgu_representative_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS srp_select_partner ON public.sgu_representative_profiles;
CREATE POLICY srp_select_partner ON public.sgu_representative_profiles
  FOR SELECT TO authenticated
  USING (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin());

DROP POLICY IF EXISTS srp_select_own ON public.sgu_representative_profiles;
CREATE POLICY srp_select_own ON public.sgu_representative_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS srp_insert_partner ON public.sgu_representative_profiles;
CREATE POLICY srp_insert_partner ON public.sgu_representative_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin());

DROP POLICY IF EXISTS srp_update_partner ON public.sgu_representative_profiles;
CREATE POLICY srp_update_partner ON public.sgu_representative_profiles
  FOR UPDATE TO authenticated
  USING (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin())
  WITH CHECK (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin());

DROP POLICY IF EXISTS srp_update_own ON public.sgu_representative_profiles;
CREATE POLICY srp_update_own ON public.sgu_representative_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS srp_delete_partner ON public.sgu_representative_profiles;
CREATE POLICY srp_delete_partner ON public.sgu_representative_profiles
  FOR DELETE TO authenticated
  USING (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin());

CREATE OR REPLACE FUNCTION public.fn_srp_protect_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id
     AND NOT (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin())
  THEN
    NEW.active := OLD.active;
    NEW.team_id := OLD.team_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.email := OLD.email;
    NEW.first_name := OLD.first_name;
    NEW.last_name := OLD.last_name;
    NEW.deactivated_at := OLD.deactivated_at;
    NEW.deactivated_reason := OLD.deactivated_reason;
    NEW.invited_at := OLD.invited_at;
    NEW.invited_by_user_id := OLD.invited_by_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_srp_protect_columns ON public.sgu_representative_profiles;
CREATE TRIGGER trg_srp_protect_columns
  BEFORE UPDATE ON public.sgu_representative_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_srp_protect_columns();

-- Drop existing functions (different return type)
DROP FUNCTION IF EXISTS public.rpc_sgu_deactivate_representative(uuid, text);
DROP FUNCTION IF EXISTS public.rpc_sgu_deactivate_representative(uuid);
DROP FUNCTION IF EXISTS public.rpc_sgu_reactivate_representative(uuid);

CREATE OR REPLACE FUNCTION public.rpc_sgu_deactivate_representative(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Brak uprawnień do dezaktywacji przedstawiciela';
  END IF;

  UPDATE public.sgu_representative_profiles
     SET active = false, deactivated_at = now(), deactivated_reason = p_reason, updated_at = now()
   WHERE user_id = p_user_id;

  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'sgu';

  UPDATE public.deal_team_representative_assignments
     SET active = false, unassigned_at = now()
   WHERE representative_user_id = p_user_id AND active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sgu_reactivate_representative(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF NOT (public.is_sgu_partner() OR public.get_current_director_id() IS NOT NULL OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Brak uprawnień do reaktywacji przedstawiciela';
  END IF;

  SELECT tenant_id INTO v_tenant FROM public.sgu_representative_profiles WHERE user_id = p_user_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Profil przedstawiciela nie znaleziony';
  END IF;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (p_user_id, v_tenant, 'sgu')
  ON CONFLICT DO NOTHING;

  UPDATE public.sgu_representative_profiles
     SET active = true, deactivated_at = NULL, deactivated_reason = NULL, updated_at = now()
   WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sgu_complete_onboarding(p_phone text DEFAULT NULL, p_region text DEFAULT NULL, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Wymagana autentykacja';
  END IF;

  UPDATE public.sgu_representative_profiles
     SET phone = COALESCE(p_phone, phone),
         region = COALESCE(p_region, region),
         notes = COALESCE(p_notes, notes),
         onboarded_at = COALESCE(onboarded_at, now()),
         updated_at = now()
   WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_sgu_deactivate_representative(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sgu_reactivate_representative(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sgu_complete_onboarding(text, text, text) TO authenticated;
