-- Sprint 03: Prospects consolidation
CREATE SCHEMA IF NOT EXISTS archive;

-- 1. ARCHIWIZACJA
CREATE TABLE archive.pipeline_stages_backup_20260418 AS SELECT * FROM public.pipeline_stages;
CREATE TABLE archive.pipeline_transitions_backup_20260418 AS SELECT * FROM public.pipeline_transitions;
CREATE TABLE archive.pipeline_kpi_targets_backup_20260418 AS SELECT * FROM public.pipeline_kpi_targets;
CREATE TABLE archive.meeting_prospects_backup_20260418 AS SELECT * FROM public.meeting_prospects;
CREATE TABLE archive.deal_team_prospects_backup_20260418 AS SELECT * FROM public.deal_team_prospects;

-- 2. deal_teams.kpi_targets JSONB + migracja z pipeline_kpi_targets (tenant-level, agregat)
ALTER TABLE public.deal_teams ADD COLUMN IF NOT EXISTS kpi_targets jsonb DEFAULT '{}'::jsonb;

UPDATE public.deal_teams dt
SET kpi_targets = COALESCE(dt.kpi_targets, '{}'::jsonb) || jsonb_build_object(
  'yearly', (
    SELECT jsonb_object_agg(
      pkt.year::text,
      jsonb_build_object(
        'target_premium', pkt.target_premium,
        'target_commission', pkt.target_commission,
        'target_commission_rate', pkt.target_commission_rate,
        'monthly', COALESCE((
          SELECT jsonb_object_agg(pkt2.month::text, jsonb_build_object(
            'target_premium', pkt2.target_premium,
            'target_commission', pkt2.target_commission
          ))
          FROM public.pipeline_kpi_targets pkt2
          WHERE pkt2.tenant_id = dt.tenant_id AND pkt2.year = pkt.year AND pkt2.month IS NOT NULL
        ), '{}'::jsonb)
      )
    )
    FROM public.pipeline_kpi_targets pkt
    WHERE pkt.tenant_id = dt.tenant_id AND pkt.month IS NULL
  )
)
WHERE EXISTS (SELECT 1 FROM public.pipeline_kpi_targets pkt WHERE pkt.tenant_id = dt.tenant_id);

-- 3. DROP nieużywanych tabel (pipeline_stages ZOSTAJE)
DROP TABLE IF EXISTS public.pipeline_transitions CASCADE;
DROP TABLE IF EXISTS public.pipeline_kpi_targets CASCADE;

-- 4. Nowa public.prospects
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('meeting','team','wanted','import')),
  source_id uuid,
  team_id uuid REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  meeting_id uuid,
  full_name text NOT NULL,
  company text,
  company_id uuid REFERENCES public.companies(id),
  position text,
  industry text,
  phone text,
  email text,
  linkedin_url text,
  source_event text,
  source_file_name text,
  status text NOT NULL DEFAULT 'new',
  priority text,
  is_prospecting boolean DEFAULT true,
  notes text,
  ai_brief jsonb,
  ai_brief_generated_at timestamptz,
  converted_to_contact_id uuid REFERENCES public.contacts(id),
  converted_to_team_contact_id uuid,
  converted_at timestamptz,
  imported_by uuid,
  imported_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_prospects_tenant_source ON public.prospects(tenant_id, source_type, source_id);
CREATE INDEX idx_prospects_team ON public.prospects(team_id);
CREATE INDEX idx_prospects_meeting ON public.prospects(meeting_id);
CREATE INDEX idx_prospects_converted ON public.prospects(converted_to_contact_id);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY prospects_select ON public.prospects FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY prospects_insert ON public.prospects FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY prospects_update ON public.prospects FOR UPDATE
  USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY prospects_delete ON public.prospects FOR DELETE
  USING (tenant_id = public.get_current_tenant_id());

CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Backfill z meeting_prospects (123 rows)
INSERT INTO public.prospects (
  id, tenant_id, source_type, source_id, team_id, meeting_id,
  full_name, company, position, industry, email, phone, linkedin_url,
  source_event, source_file_name, status, priority, is_prospecting, notes,
  ai_brief, ai_brief_generated_at,
  converted_to_contact_id, converted_to_team_contact_id, converted_at,
  imported_by, imported_at, created_at, updated_at
)
SELECT
  id, tenant_id, 'meeting', team_id, team_id, meeting_id,
  full_name, company, position, industry, email, phone, linkedin_url,
  source_event, source_file_name, COALESCE(prospecting_status,'new'), priority, is_prospecting, prospecting_notes,
  CASE WHEN ai_brief IS NOT NULL THEN jsonb_build_object('text', ai_brief, 'generated_at', ai_brief_generated_at) END,
  ai_brief_generated_at,
  converted_to_contact_id, converted_to_team_contact_id, converted_at,
  imported_by, imported_at, created_at, updated_at
FROM public.meeting_prospects;

-- 6. Backfill z deal_team_prospects (0 rows, safety)
INSERT INTO public.prospects (
  id, tenant_id, source_type, source_id, team_id,
  full_name, company, position, email, phone, linkedin_url,
  status, priority, notes, converted_to_contact_id, company_id, created_at, updated_at
)
SELECT
  id, tenant_id, 'team', team_id, team_id,
  prospect_name, prospect_company, prospect_position, prospect_email, prospect_phone, prospect_linkedin,
  COALESCE(status,'new'), priority, prospect_notes, converted_to_contact_id, company_id, created_at, updated_at
FROM public.deal_team_prospects;

-- 7. Deprecation rename
ALTER TABLE public.meeting_prospects RENAME TO deprecated_meeting_prospects_20260418;
ALTER TABLE public.deal_team_prospects RENAME TO deprecated_deal_team_prospects_20260418;

-- 8. Weryfikacja count
DO $$ DECLARE old_c int; new_c int;
BEGIN
  SELECT (SELECT COUNT(*) FROM archive.meeting_prospects_backup_20260418)
       + (SELECT COUNT(*) FROM archive.deal_team_prospects_backup_20260418) INTO old_c;
  SELECT COUNT(*) INTO new_c FROM public.prospects;
  IF old_c <> new_c THEN RAISE EXCEPTION 'COUNT MISMATCH: old=% new=%', old_c, new_c; END IF;
  RAISE NOTICE 'OK: prospects migrated %=%', old_c, new_c;
END $$;

-- ROLLBACK:
-- DROP TABLE public.prospects;
-- ALTER TABLE public.deprecated_meeting_prospects_20260418 RENAME TO meeting_prospects;
-- ALTER TABLE public.deprecated_deal_team_prospects_20260418 RENAME TO deal_team_prospects;
-- CREATE TABLE public.pipeline_transitions AS SELECT * FROM archive.pipeline_transitions_backup_20260418;
-- CREATE TABLE public.pipeline_kpi_targets AS SELECT * FROM archive.pipeline_kpi_targets_backup_20260418;
-- ALTER TABLE public.deal_teams DROP COLUMN kpi_targets;