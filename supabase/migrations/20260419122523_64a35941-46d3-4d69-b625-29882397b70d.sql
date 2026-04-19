-- Sprint SGU-01 — Enable SGU layout flag
UPDATE public.sgu_settings
SET enable_sgu_layout = true,
    updated_at = now()
WHERE enable_sgu_layout = false;
-- ROLLBACK: UPDATE public.sgu_settings SET enable_sgu_layout = false, updated_at = now();