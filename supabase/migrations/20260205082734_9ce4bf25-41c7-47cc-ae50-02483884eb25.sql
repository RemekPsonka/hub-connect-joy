-- Wyłącz dostęp do mv_dashboard_stats przez API (dane dostępne tylko przez get_dashboard_stats RPC)
REVOKE SELECT ON mv_dashboard_stats FROM anon, authenticated;