-- Sprint SGU-05 — Prospecting manual + CSV import
-- 1. archive snapshot
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.deal_team_contacts_backup_20260419_sgu05 AS
  SELECT * FROM public.deal_team_contacts;

-- 2. presets table
CREATE TABLE IF NOT EXISTS public.sgu_csv_import_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  column_mapping jsonb NOT NULL,
  description text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  usage_count int NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sgu_csv_presets_tenant_used
  ON public.sgu_csv_import_presets(tenant_id, last_used_at DESC NULLS LAST);

COMMENT ON TABLE public.sgu_csv_import_presets IS
  'Zapisane mapowania kolumn CSV dla importu leadow SGU. Klucz: (tenant_id, name).';

-- 3. RLS
ALTER TABLE public.sgu_csv_import_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sgu_csv_presets_select ON public.sgu_csv_import_presets;
CREATE POLICY sgu_csv_presets_select ON public.sgu_csv_import_presets FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.is_sgu_partner()
      OR public.get_current_director_id() IS NOT NULL
      OR public.is_superadmin()
    )
  );

DROP POLICY IF EXISTS sgu_csv_presets_insert ON public.sgu_csv_import_presets;
CREATE POLICY sgu_csv_presets_insert ON public.sgu_csv_import_presets FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.is_sgu_partner()
      OR public.get_current_director_id() IS NOT NULL
      OR public.is_superadmin()
    )
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS sgu_csv_presets_update ON public.sgu_csv_import_presets;
CREATE POLICY sgu_csv_presets_update ON public.sgu_csv_import_presets FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.is_sgu_partner()
      OR public.get_current_director_id() IS NOT NULL
      OR public.is_superadmin()
    )
  );

DROP POLICY IF EXISTS sgu_csv_presets_delete ON public.sgu_csv_import_presets;
CREATE POLICY sgu_csv_presets_delete ON public.sgu_csv_import_presets FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      public.get_current_director_id() IS NOT NULL
      OR public.is_superadmin()
      OR created_by_user_id = auth.uid()
    )
  );

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_sgu_csv_presets_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sgu_csv_presets_updated_at ON public.sgu_csv_import_presets;
CREATE TRIGGER trg_sgu_csv_presets_updated_at
  BEFORE UPDATE ON public.sgu_csv_import_presets
  FOR EACH ROW EXECUTE FUNCTION public.tg_sgu_csv_presets_touch_updated_at();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_sgu_csv_presets_updated_at ON public.sgu_csv_import_presets;
-- DROP FUNCTION IF EXISTS public.tg_sgu_csv_presets_touch_updated_at();
-- DROP TABLE IF EXISTS public.sgu_csv_import_presets;