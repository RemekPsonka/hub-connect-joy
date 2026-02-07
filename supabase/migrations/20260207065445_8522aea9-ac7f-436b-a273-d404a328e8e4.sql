
-- ============================================================
-- IZOLACJA RLS PER DYREKTOR — ATOMOWA MIGRACJA
-- ============================================================

-- 1. Dodaj kolumnę director_id na contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS director_id uuid REFERENCES public.directors(id);

-- 2. Wypełnij director_id na podstawie grup
-- Grupy Pawła -> Paweł
UPDATE public.contacts SET director_id = 'f6133796-744f-47a0-97a2-f9b11cb51d81'
WHERE primary_group_id IN (
  'fc0bfca9-5904-4ae5-9a57-19364aa43b71',  -- Baza kontaktów Paweł
  '1e45d2aa-0c0a-49c7-bab7-7c0dc15a0ab5'   -- Członek CC Paweł
);

-- Wszystkie pozostałe -> Remek (owner)
UPDATE public.contacts SET director_id = '98a271e8-d923-49cb-a6aa-45f3ac0064d8'
WHERE director_id IS NULL;

-- 3. Trigger: automatycznie ustaw director_id na INSERT
CREATE OR REPLACE FUNCTION public.set_contact_director_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.director_id IS NULL THEN
    NEW.director_id := get_current_director_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_contact_director_id
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_director_id();

-- 4. Indeks na director_id
CREATE INDEX IF NOT EXISTS idx_contacts_director_id ON public.contacts(director_id);

-- ============================================================
-- 5. Tabela contact_shares
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  shared_with_director_id uuid NOT NULL REFERENCES public.directors(id),
  shared_by_director_id uuid NOT NULL REFERENCES public.directors(id),
  permission text NOT NULL DEFAULT 'read',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_shares_permission_check CHECK (permission IN ('read', 'write')),
  CONSTRAINT contact_shares_unique UNIQUE (contact_id, shared_with_director_id)
);

ALTER TABLE public.contact_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_shares_contact ON public.contact_shares(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_shares_shared_with ON public.contact_shares(shared_with_director_id);

-- RLS na contact_shares
CREATE POLICY "contact_shares_select" ON public.contact_shares
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      shared_with_director_id = get_current_director_id()
      OR shared_by_director_id = get_current_director_id()
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );

CREATE POLICY "contact_shares_insert" ON public.contact_shares
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND shared_by_director_id = get_current_director_id()
  );

CREATE POLICY "contact_shares_delete" ON public.contact_shares
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      shared_by_director_id = get_current_director_id()
      OR is_tenant_admin(auth.uid(), tenant_id)
    )
  );

-- ============================================================
-- 6. Funkcja pomocnicza can_access_contact
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_contact(_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = _contact_id
    AND c.tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), c.tenant_id)
      OR c.director_id = get_current_director_id()
      OR EXISTS (
        SELECT 1 FROM public.contact_shares cs
        WHERE cs.contact_id = c.id
        AND cs.shared_with_director_id = get_current_director_id()
      )
      OR is_assistant(auth.uid())
    )
  )
$$;

-- ============================================================
-- 7. CONTACTS — nowe polityki SELECT/INSERT/UPDATE/DELETE
-- ============================================================
-- Usuń stare polityki (ALL) dla dyrektorów
DROP POLICY IF EXISTS "Contacts tenant access" ON public.contacts;
DROP POLICY IF EXISTS "tenant_access" ON public.contacts;

-- SELECT: dyrektor widzi swoje + udostępnione + admin widzi wszystko
CREATE POLICY "contacts_director_select" ON public.contacts
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
      OR EXISTS (
        SELECT 1 FROM public.contact_shares cs
        WHERE cs.contact_id = contacts.id
        AND cs.shared_with_director_id = get_current_director_id()
      )
    )
  );

-- INSERT: dyrektor tworzy kontakty w swoim tenancie
CREATE POLICY "contacts_director_insert" ON public.contacts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
  );

-- UPDATE: dyrektor aktualizuje swoje kontakty + udostępnione z write + admin
CREATE POLICY "contacts_director_update" ON public.contacts
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
      OR EXISTS (
        SELECT 1 FROM public.contact_shares cs
        WHERE cs.contact_id = contacts.id
        AND cs.shared_with_director_id = get_current_director_id()
        AND cs.permission = 'write'
      )
    )
  );

-- DELETE: tylko właściciel lub admin
CREATE POLICY "contacts_director_delete" ON public.contacts
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
    )
  );

-- ============================================================
-- 8. TASKS — zaktualizowane polityki
-- ============================================================
DROP POLICY IF EXISTS "Tasks visibility select" ON public.tasks;
DROP POLICY IF EXISTS "Tasks update own or assigned" ON public.tasks;
DROP POLICY IF EXISTS "Tasks delete own" ON public.tasks;

CREATE POLICY "tasks_director_select" ON public.tasks
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
      OR assigned_to = get_current_director_id()
    )
  );

CREATE POLICY "tasks_director_update" ON public.tasks
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
      OR assigned_to = get_current_director_id()
    )
  );

CREATE POLICY "tasks_director_delete" ON public.tasks
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
    )
  );

-- ============================================================
-- 9. PROJECTS — nowe polityki
-- ============================================================
DROP POLICY IF EXISTS "Tenant isolation" ON public.projects;

CREATE POLICY "projects_director_select" ON public.projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
      OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = projects.id
        AND pm.director_id = get_current_director_id()
      )
    )
  );

CREATE POLICY "projects_director_insert" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
  );

CREATE POLICY "projects_director_update" ON public.projects
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
    )
  );

CREATE POLICY "projects_director_delete" ON public.projects
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
    )
  );

-- ============================================================
-- 10. CONSULTATIONS — izolacja per director_id
-- ============================================================
DROP POLICY IF EXISTS "tenant_access" ON public.consultations;

CREATE POLICY "consultations_director_select" ON public.consultations
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
    )
  );

CREATE POLICY "consultations_director_insert" ON public.consultations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND director_id = get_current_director_id()
  );

CREATE POLICY "consultations_director_update" ON public.consultations
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
    )
  );

CREATE POLICY "consultations_director_delete" ON public.consultations
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
    )
  );

-- ============================================================
-- 11. NEEDS — izolacja przez can_access_contact
-- ============================================================
DROP POLICY IF EXISTS "Needs tenant access" ON public.needs;
DROP POLICY IF EXISTS "tenant_access" ON public.needs;

CREATE POLICY "needs_director_select" ON public.needs
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "needs_director_insert" ON public.needs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND can_access_contact(contact_id)
  );

CREATE POLICY "needs_director_update" ON public.needs
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "needs_director_delete" ON public.needs
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

-- ============================================================
-- 12. OFFERS — izolacja przez can_access_contact
-- ============================================================
DROP POLICY IF EXISTS "Offers tenant access" ON public.offers;
DROP POLICY IF EXISTS "tenant_access" ON public.offers;

CREATE POLICY "offers_director_select" ON public.offers
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "offers_director_insert" ON public.offers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND can_access_contact(contact_id)
  );

CREATE POLICY "offers_director_update" ON public.offers
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "offers_director_delete" ON public.offers
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

-- ============================================================
-- 13. CONTACT_ACTIVITY_LOG — izolacja przez can_access_contact
-- ============================================================
DROP POLICY IF EXISTS "Contact activity log tenant access" ON public.contact_activity_log;

CREATE POLICY "cal_director_select" ON public.contact_activity_log
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "cal_director_insert" ON public.contact_activity_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND can_access_contact(contact_id)
  );

CREATE POLICY "cal_director_update" ON public.contact_activity_log
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "cal_director_delete" ON public.contact_activity_log
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

-- ============================================================
-- 14. CONTACT_AGENT_MEMORY — izolacja przez can_access_contact
-- ============================================================
DROP POLICY IF EXISTS "Contact agent memory tenant access" ON public.contact_agent_memory;

CREATE POLICY "cam_director_select" ON public.contact_agent_memory
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "cam_director_insert" ON public.contact_agent_memory
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND can_access_contact(contact_id)
  );

CREATE POLICY "cam_director_update" ON public.contact_agent_memory
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "cam_director_delete" ON public.contact_agent_memory
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

-- ============================================================
-- 15. BUSINESS_INTERVIEWS — izolacja przez can_access_contact
-- ============================================================
DROP POLICY IF EXISTS "bi_select_own_tenant" ON public.business_interviews;
DROP POLICY IF EXISTS "bi_insert_own_tenant" ON public.business_interviews;
DROP POLICY IF EXISTS "bi_update_own_tenant" ON public.business_interviews;
DROP POLICY IF EXISTS "bi_delete_own_tenant" ON public.business_interviews;

CREATE POLICY "bi_director_select" ON public.business_interviews
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "bi_director_insert" ON public.business_interviews
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = get_current_tenant_id()
    AND can_access_contact(contact_id)
  );

CREATE POLICY "bi_director_update" ON public.business_interviews
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );

CREATE POLICY "bi_director_delete" ON public.business_interviews
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND can_access_contact(contact_id)
  );
