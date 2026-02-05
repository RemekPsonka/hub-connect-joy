-- Zabezpieczenie: Odwołanie dostępu do materialized view przez API
-- (Materialized views nie wspierają RLS, więc musimy zablokować bezpośredni dostęp)
REVOKE ALL ON mv_dashboard_stats FROM anon, authenticated;

-- Dostęp jest możliwy tylko przez funkcję get_dashboard_stats(uuid)