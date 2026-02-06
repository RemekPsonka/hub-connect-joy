
-- Revoke API access to mv_deal_pipeline_stats (should only be accessed via refresh_deal_pipeline_stats RPC)
REVOKE ALL ON mv_deal_pipeline_stats FROM anon, authenticated;
