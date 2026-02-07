
-- =====================================================
-- FAZA 2: Companies RLS + Dashboard stats per director
-- =====================================================

-- 1. Companies RLS -- izolacja przez kontakty
-- Usuwamy starą politykę "każdy w tenancie widzi wszystko"
DROP POLICY IF EXISTS "Companies tenant access" ON companies;

-- SELECT: admin widzi wszystko, dyrektor widzi firmy powiązane z dostępnymi kontaktami
CREATE POLICY "companies_director_select" ON companies
  FOR SELECT USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM contacts c 
        WHERE c.company_id = companies.id 
        AND can_access_contact(c.id)
      )
    )
  );

-- INSERT: każdy dyrektor w tenancie może tworzyć firmy
CREATE POLICY "companies_director_insert" ON companies
  FOR INSERT WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- UPDATE: admin lub właściciel kontaktu w firmie
CREATE POLICY "companies_director_update" ON companies
  FOR UPDATE USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM contacts c 
        WHERE c.company_id = companies.id 
        AND c.director_id = get_current_director_id()
      )
    )
  ) WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- DELETE: admin lub właściciel kontaktu w firmie
CREATE POLICY "companies_director_delete" ON companies
  FOR DELETE USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR EXISTS (
        SELECT 1 FROM contacts c 
        WHERE c.company_id = companies.id 
        AND c.director_id = get_current_director_id()
      )
    )
  );

-- 2. Przebudowa get_dashboard_stats() -- per director dla nie-adminów
DROP FUNCTION IF EXISTS get_dashboard_stats();

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
  total_contacts bigint,
  new_contacts_30d bigint,
  contacts_prev_30d bigint,
  today_consultations bigint,
  pending_tasks bigint,
  active_needs bigint,
  active_offers bigint,
  pending_matches bigint,
  upcoming_meetings bigint,
  healthy_contacts bigint,
  warning_contacts bigint,
  critical_contacts bigint,
  refreshed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID := get_current_tenant_id();
  v_director_id UUID := get_current_director_id();
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_tenant_admin(auth.uid(), v_tenant_id) INTO v_is_admin;
  
  IF v_is_admin THEN
    -- Admin: szybko z materialized view (globalne stats)
    RETURN QUERY
    SELECT 
      mv.total_contacts, mv.new_contacts_30d, mv.contacts_prev_30d,
      mv.today_consultations, mv.pending_tasks, mv.active_needs,
      mv.active_offers, mv.pending_matches, mv.upcoming_meetings,
      mv.healthy_contacts, mv.warning_contacts, mv.critical_contacts,
      mv.refreshed_at
    FROM mv_dashboard_stats mv
    WHERE mv.tenant_id = v_tenant_id;
  ELSE
    -- Dyrektor: liczy tylko swoje dane
    RETURN QUERY SELECT
      -- total_contacts: kontakty dyrektora + udostępnione
      (SELECT COUNT(*) FROM contacts c 
       WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true 
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- new_contacts_30d
      (SELECT COUNT(*) FROM contacts c 
       WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true 
       AND c.created_at >= NOW() - INTERVAL '30 days'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- contacts_prev_30d
      (SELECT COUNT(*) FROM contacts c 
       WHERE c.tenant_id = v_tenant_id 
       AND c.is_active = true 
       AND c.created_at >= NOW() - INTERVAL '60 days'
       AND c.created_at < NOW() - INTERVAL '30 days'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- today_consultations
      (SELECT COUNT(*) FROM consultations co
       WHERE co.tenant_id = v_tenant_id
       AND co.director_id = v_director_id
       AND co.scheduled_at::date = CURRENT_DATE)::bigint,
       
      -- pending_tasks
      (SELECT COUNT(*) FROM tasks tk
       WHERE tk.tenant_id = v_tenant_id
       AND tk.status = 'pending'
       AND (tk.owner_id = v_director_id OR tk.assigned_to = v_director_id))::bigint,
       
      -- active_needs: tylko z dostępnych kontaktów
      (SELECT COUNT(*) FROM needs n
       JOIN contacts c ON c.id = n.contact_id
       WHERE n.tenant_id = v_tenant_id
       AND n.status = 'active'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- active_offers: tylko z dostępnych kontaktów
      (SELECT COUNT(*) FROM offers o
       JOIN contacts c ON c.id = o.contact_id
       WHERE o.tenant_id = v_tenant_id
       AND o.status = 'active'
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- pending_matches: 0 for non-admin (feature jest adminOnly)
      0::bigint,
       
      -- upcoming_meetings
      (SELECT COUNT(*) FROM group_meetings gm
       WHERE gm.tenant_id = v_tenant_id
       AND gm.status = 'upcoming')::bigint,
       
      -- healthy_contacts
      (SELECT COUNT(*) FROM relationship_health rh
       JOIN contacts c ON c.id = rh.contact_id
       WHERE c.tenant_id = v_tenant_id
       AND rh.health_score >= 70
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- warning_contacts
      (SELECT COUNT(*) FROM relationship_health rh
       JOIN contacts c ON c.id = rh.contact_id
       WHERE c.tenant_id = v_tenant_id
       AND rh.health_score >= 40 AND rh.health_score <= 69
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      -- critical_contacts
      (SELECT COUNT(*) FROM relationship_health rh
       JOIN contacts c ON c.id = rh.contact_id
       WHERE c.tenant_id = v_tenant_id
       AND rh.health_score < 40
       AND (c.director_id = v_director_id 
            OR EXISTS (SELECT 1 FROM contact_shares cs WHERE cs.contact_id = c.id AND cs.shared_with_director_id = v_director_id)
       ))::bigint,
       
      NOW();
  END IF;
END;
$$;
