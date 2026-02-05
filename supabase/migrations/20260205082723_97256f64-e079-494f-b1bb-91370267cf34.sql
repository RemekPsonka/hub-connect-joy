-- Krok 1: Usunięcie istniejących obiektów (MV i funkcji)
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_stats CASCADE;
DROP FUNCTION IF EXISTS refresh_dashboard_stats();

-- Krok 2: Utworzenie nowego MV z rozbudowanymi metrykami
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
  t.id AS tenant_id,
  (SELECT COUNT(*) FROM contacts c 
   WHERE c.tenant_id = t.id AND c.is_active = true) AS total_contacts,
  (SELECT COUNT(*) FROM contacts c 
   WHERE c.tenant_id = t.id AND c.is_active = true
   AND c.created_at >= NOW() - INTERVAL '30 days') AS new_contacts_30d,
  (SELECT COUNT(*) FROM contacts c 
   WHERE c.tenant_id = t.id AND c.is_active = true
   AND c.created_at >= NOW() - INTERVAL '60 days'
   AND c.created_at < NOW() - INTERVAL '30 days') AS contacts_prev_30d,
  (SELECT COUNT(*) FROM consultations co
   JOIN contacts c ON c.id = co.contact_id
   WHERE c.tenant_id = t.id 
   AND co.scheduled_at::date = CURRENT_DATE) AS today_consultations,
  (SELECT COUNT(*) FROM tasks tk 
   WHERE tk.tenant_id = t.id AND tk.status = 'pending') AS pending_tasks,
  (SELECT COUNT(*) FROM needs n 
   WHERE n.tenant_id = t.id AND n.status = 'active') AS active_needs,
  (SELECT COUNT(*) FROM offers o 
   WHERE o.tenant_id = t.id AND o.status = 'active') AS active_offers,
  (SELECT COUNT(*) FROM matches m 
   WHERE m.tenant_id = t.id AND m.status = 'pending') AS pending_matches,
  (SELECT COUNT(*) FROM group_meetings gm 
   WHERE gm.tenant_id = t.id AND gm.status = 'upcoming') AS upcoming_meetings,
  (SELECT COUNT(*) FROM relationship_health rh
   JOIN contacts c ON c.id = rh.contact_id
   WHERE c.tenant_id = t.id AND rh.health_score >= 70) AS healthy_contacts,
  (SELECT COUNT(*) FROM relationship_health rh
   JOIN contacts c ON c.id = rh.contact_id
   WHERE c.tenant_id = t.id 
   AND rh.health_score BETWEEN 40 AND 69) AS warning_contacts,
  (SELECT COUNT(*) FROM relationship_health rh
   JOIN contacts c ON c.id = rh.contact_id
   WHERE c.tenant_id = t.id AND rh.health_score < 40) AS critical_contacts,
  NOW() AS refreshed_at
FROM tenants t;

-- Krok 3: Unikalny indeks
CREATE UNIQUE INDEX idx_mv_dashboard_stats_tenant ON mv_dashboard_stats(tenant_id);

-- Krok 4: Nowa funkcja RPC
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
  total_contacts BIGINT,
  new_contacts_30d BIGINT,
  contacts_prev_30d BIGINT,
  today_consultations BIGINT,
  pending_tasks BIGINT,
  active_needs BIGINT,
  active_offers BIGINT,
  pending_matches BIGINT,
  upcoming_meetings BIGINT,
  healthy_contacts BIGINT,
  warning_contacts BIGINT,
  critical_contacts BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := get_current_tenant_id();
BEGIN
  RETURN QUERY
  SELECT 
    mv.total_contacts, mv.new_contacts_30d, mv.contacts_prev_30d,
    mv.today_consultations, mv.pending_tasks, mv.active_needs,
    mv.active_offers, mv.pending_matches, mv.upcoming_meetings,
    mv.healthy_contacts, mv.warning_contacts, mv.critical_contacts,
    mv.refreshed_at
  FROM mv_dashboard_stats mv
  WHERE mv.tenant_id = v_tenant_id;
END;
$$;

-- Krok 5: Funkcja trigger
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  RETURN NULL;
END;
$$;

-- Krok 6: Triggery
DROP TRIGGER IF EXISTS trg_refresh_dash_contacts ON contacts;
DROP TRIGGER IF EXISTS trg_refresh_dash_tasks ON tasks;
DROP TRIGGER IF EXISTS trg_refresh_dash_consultations ON consultations;
DROP TRIGGER IF EXISTS trg_refresh_dash_needs ON needs;
DROP TRIGGER IF EXISTS trg_refresh_dash_matches ON matches;

CREATE TRIGGER trg_refresh_dash_contacts
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_needs
  AFTER INSERT OR UPDATE OR DELETE ON needs
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_matches
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();