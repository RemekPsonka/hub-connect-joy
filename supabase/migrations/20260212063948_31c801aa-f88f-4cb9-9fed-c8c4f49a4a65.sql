
-- 1. Tabela contact_group_shares
CREATE TABLE public.contact_group_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  group_id UUID NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  shared_with_director_id UUID REFERENCES public.directors(id) ON DELETE CASCADE,
  shared_with_team_id UUID REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, shared_with_director_id),
  UNIQUE(group_id, shared_with_team_id)
);

-- 2. Trigger walidacyjny
CREATE OR REPLACE FUNCTION public.validate_contact_group_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.shared_with_director_id IS NULL AND NEW.shared_with_team_id IS NULL THEN
    RAISE EXCEPTION 'Either shared_with_director_id or shared_with_team_id must be provided';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_contact_group_share
  BEFORE INSERT OR UPDATE ON public.contact_group_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contact_group_share();

-- 3. RLS na contact_group_shares
ALTER TABLE public.contact_group_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cgs_admin_all" ON public.contact_group_shares
  FOR ALL
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "cgs_director_select" ON public.contact_group_shares
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      shared_with_director_id = get_current_director_id()
      OR EXISTS (
        SELECT 1 FROM deal_team_members dtm
        WHERE dtm.team_id = contact_group_shares.shared_with_team_id
        AND dtm.director_id = get_current_director_id()
        AND dtm.is_active = true
      )
    )
  );

-- 4. Aktualizacja contacts_director_select
DROP POLICY "contacts_director_select" ON public.contacts;

CREATE POLICY "contacts_director_select" ON public.contacts
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      -- Admin widzi wszystko
      is_tenant_admin(auth.uid(), tenant_id)
      -- Wlasciciel kontaktu
      OR director_id = get_current_director_id()
      -- Udostepnione kontakty (indywidualne)
      OR EXISTS (
        SELECT 1 FROM public.contact_shares cs
        WHERE cs.contact_id = contacts.id
        AND cs.shared_with_director_id = get_current_director_id()
      )
      -- Czlonek zespolu Deals widzi kontakty przypisane do jego zespolu
      OR EXISTS (
        SELECT 1 FROM public.deal_team_contacts dtc
        INNER JOIN public.deal_team_members dtm ON dtm.team_id = dtc.team_id
        WHERE dtc.contact_id = contacts.id
        AND dtm.director_id = get_current_director_id()
        AND dtm.is_active = true
      )
      -- Udostepniona grupa kontaktow (bezposrednio do dyrektora)
      OR EXISTS (
        SELECT 1 FROM public.contact_group_shares cgs
        WHERE cgs.group_id = contacts.primary_group_id
        AND cgs.shared_with_director_id = get_current_director_id()
      )
      -- Udostepniona grupa kontaktow (przez zespol)
      OR EXISTS (
        SELECT 1 FROM public.contact_group_shares cgs
        INNER JOIN public.deal_team_members dtm ON dtm.team_id = cgs.shared_with_team_id
        WHERE cgs.group_id = contacts.primary_group_id
        AND dtm.director_id = get_current_director_id()
        AND dtm.is_active = true
      )
    )
  );

-- 5. Ograniczenie widocznosci deal_teams
DROP POLICY "deal_teams_select" ON public.deal_teams;

CREATE POLICY "deal_teams_select" ON public.deal_teams
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.deal_team_members
        WHERE team_id = deal_teams.id
        AND director_id = get_current_director_id()
        AND is_active = true
      )
    )
  );

-- 6. Ograniczenie widocznosci deal_team_members
DROP POLICY "dtm_select" ON public.deal_team_members;

CREATE POLICY "dtm_select" ON public.deal_team_members
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.deal_team_members dtm2
        WHERE dtm2.team_id = deal_team_members.team_id
        AND dtm2.director_id = get_current_director_id()
        AND dtm2.is_active = true
      )
    )
  );

DROP POLICY "team_members_select" ON public.deal_team_members;

CREATE POLICY "team_members_select" ON public.deal_team_members
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM public.deal_team_members dtm2
        WHERE dtm2.team_id = deal_team_members.team_id
        AND dtm2.director_id = get_current_director_id()
        AND dtm2.is_active = true
      )
    )
  );
