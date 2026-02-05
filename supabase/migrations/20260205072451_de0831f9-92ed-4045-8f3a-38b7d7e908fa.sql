-- =====================================================
-- Materialized View dla metryk dashboardu
-- =====================================================

-- Krok 1: Materialized View z agregacjami
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
  c.tenant_id,
  COUNT(DISTINCT c.id) as total_contacts,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as active_contacts,
  COUNT(DISTINCT comp.id) as total_companies,
  COUNT(DISTINCT n.id) FILTER (WHERE n.status = 'active') as active_needs,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'active') as active_offers,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as completed_tasks
FROM contacts c
LEFT JOIN companies comp ON comp.tenant_id = c.tenant_id
LEFT JOIN needs n ON n.contact_id = c.id
LEFT JOIN offers o ON o.contact_id = c.id
LEFT JOIN tasks t ON t.tenant_id = c.tenant_id
GROUP BY c.tenant_id;

-- Krok 2: Unikalny indeks (wymagany dla REFRESH CONCURRENTLY)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_tenant 
ON mv_dashboard_stats(tenant_id);

-- Krok 3: Funkcja odświeżania (do wywołania przez cron/trigger)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
END;
$$;

-- Krok 4: Wrapper function z dostępem przez tenant_id
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id uuid)
RETURNS TABLE (
  total_contacts bigint,
  active_contacts bigint,
  total_companies bigint,
  active_needs bigint,
  active_offers bigint,
  pending_tasks bigint,
  completed_tasks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mv.total_contacts,
    mv.active_contacts,
    mv.total_companies,
    mv.active_needs,
    mv.active_offers,
    mv.pending_tasks,
    mv.completed_tasks
  FROM mv_dashboard_stats mv
  WHERE mv.tenant_id = p_tenant_id;
END;
$$;

-- Krok 5: Komentarze dokumentacyjne
COMMENT ON MATERIALIZED VIEW mv_dashboard_stats IS 
'Agregowane statystyki dashboardu per tenant. Odświeżane przez refresh_dashboard_stats().';

COMMENT ON FUNCTION refresh_dashboard_stats() IS 
'Odświeża materialized view ze statystykami. Użyj z cron job lub po batch operacjach.';

COMMENT ON FUNCTION get_dashboard_stats(uuid) IS 
'Bezpieczny wrapper do pobierania statystyk dla danego tenanta.';