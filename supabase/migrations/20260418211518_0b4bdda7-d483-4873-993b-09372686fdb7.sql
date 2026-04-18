-- Sprint 11 — Workspace 2.0 (notes + widgets + KPI)

-- 1. Archive workspace_topics (keep original)
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.workspace_topics_backup_20260418 AS
SELECT * FROM public.workspace_topics;

-- 2. workspace_notes
CREATE TABLE public.workspace_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  title text,
  blocks jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  parent_note_id uuid REFERENCES public.workspace_notes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspace_notes_actor ON public.workspace_notes(actor_id, pinned DESC, updated_at DESC);
CREATE INDEX idx_workspace_notes_parent ON public.workspace_notes(parent_note_id);

ALTER TABLE public.workspace_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_owner_select" ON public.workspace_notes FOR SELECT
  USING (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "notes_owner_insert" ON public.workspace_notes FOR INSERT
  WITH CHECK (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "notes_owner_update" ON public.workspace_notes FOR UPDATE
  USING (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "notes_owner_delete" ON public.workspace_notes FOR DELETE
  USING (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());

CREATE TRIGGER trg_workspace_notes_updated_at
  BEFORE UPDATE ON public.workspace_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. workspace_widgets
CREATE TABLE public.workspace_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  widget_type text NOT NULL CHECK (widget_type IN ('kpi','note','ai_recs','calendar')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  grid_x integer NOT NULL DEFAULT 0,
  grid_y integer NOT NULL DEFAULT 0,
  grid_w integer NOT NULL DEFAULT 4,
  grid_h integer NOT NULL DEFAULT 3,
  size text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspace_widgets_actor ON public.workspace_widgets(actor_id);

ALTER TABLE public.workspace_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "widgets_owner_select" ON public.workspace_widgets FOR SELECT
  USING (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "widgets_owner_insert" ON public.workspace_widgets FOR INSERT
  WITH CHECK (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "widgets_owner_update" ON public.workspace_widgets FOR UPDATE
  USING (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());
CREATE POLICY "widgets_owner_delete" ON public.workspace_widgets FOR DELETE
  USING (actor_id = public.get_current_director_id() AND tenant_id = public.get_current_tenant_id());

-- 4. RPC: workspace KPI
CREATE OR REPLACE FUNCTION public.rpc_workspace_kpi(p_metric text, p_range text DEFAULT '30d')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid := public.get_current_tenant_id();
  v_director uuid := public.get_current_director_id();
  v_days int;
  v_value numeric := 0;
  v_label text;
BEGIN
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('value', 0, 'label', 'Brak dostępu');
  END IF;

  v_days := CASE p_range
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN 'mtd' THEN EXTRACT(DAY FROM now())::int
    ELSE 30
  END;

  CASE p_metric
    WHEN 'contacts_active' THEN
      SELECT COUNT(*) INTO v_value FROM public.contacts
        WHERE tenant_id = v_tenant;
      v_label := 'Aktywne kontakty';
    WHEN 'contacts_new' THEN
      SELECT COUNT(*) INTO v_value FROM public.contacts
        WHERE tenant_id = v_tenant AND created_at >= now() - (v_days || ' days')::interval;
      v_label := 'Nowe kontakty (' || p_range || ')';
    WHEN 'tasks_today' THEN
      SELECT COUNT(*) INTO v_value FROM public.tasks
        WHERE tenant_id = v_tenant
          AND due_date = CURRENT_DATE
          AND status <> 'done';
      v_label := 'Zadania na dziś';
    WHEN 'prospects_new' THEN
      SELECT COUNT(*) INTO v_value FROM public.prospects
        WHERE tenant_id = v_tenant AND created_at >= now() - (v_days || ' days')::interval;
      v_label := 'Nowe szanse (' || p_range || ')';
    WHEN 'deals_revenue_mtd' THEN
      SELECT COALESCE(SUM(estimated_value), 0) INTO v_value FROM public.deal_team_contacts
        WHERE tenant_id = v_tenant
          AND created_at >= date_trunc('month', now());
      v_label := 'Wartość lejka MTD';
    ELSE
      v_value := 0;
      v_label := 'Nieznana metryka';
  END CASE;

  RETURN jsonb_build_object('value', v_value, 'label', v_label, 'metric', p_metric, 'range', p_range);
END;
$$;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.rpc_workspace_kpi(text, text);
-- DROP TABLE IF EXISTS public.workspace_widgets CASCADE;
-- DROP TABLE IF EXISTS public.workspace_notes CASCADE;
-- (workspace_topics nietknięte, archiwum zostaje)