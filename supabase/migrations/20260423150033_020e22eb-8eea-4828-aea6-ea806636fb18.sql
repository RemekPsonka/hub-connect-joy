-- ============================================================
-- BLOK 1 / CZĘŚĆ A — Schema drift fix
-- meeting_decisions + meeting_questions: istnieją w live DB,
-- brak w supabase/migrations/. Idempotentnie odtwarzamy 1:1 z live.
-- NIE replikujemy trg_apply_meeting_decision ani apply_meeting_decision()
-- — są w 20260422171024_*.sql.
-- NIE tworzymy enuma meeting_question_status — w live status to text (decyzja PO).
-- ============================================================

-- ─── meeting_decisions (append-only audit decyzji spotkaniowych) ────────
CREATE TABLE IF NOT EXISTS public.meeting_decisions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL,
  team_id                  uuid NOT NULL,
  deal_team_contact_id     uuid NOT NULL REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  decision_type            text NOT NULL CHECK (decision_type IN ('go','postponed','dead')),
  meeting_date             date NOT NULL,
  notes                    text,
  prev_category            text,
  prev_offering_stage      text,
  prev_temperature         text,
  next_action_date         date,
  postponed_until          date,
  dead_reason              text,
  created_by               uuid NOT NULL DEFAULT auth.uid(),
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

-- INTENCJONALNIE BRAK POLICY UPDATE/DELETE: tabela append-only (audit trail decyzji
-- spotkaniowych). Decyzja jest zdarzeniem historycznym — korekta = nowa decyzja
-- (kolejny INSERT), nigdy edycja istniejącej. Trigger trg_apply_meeting_decision
-- ustawia stan deal_team_contacts wyłącznie na podstawie tych nieedytowalnych zdarzeń.
-- NIE DODAWAJ policies UPDATE/DELETE bez explicite zgody product ownera.
DO $$ BEGIN
  CREATE POLICY meeting_decisions_select ON public.meeting_decisions
    FOR SELECT USING (
      tenant_id = public.get_current_tenant_id()
      AND public.is_deal_team_member(team_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY meeting_decisions_insert ON public.meeting_decisions
    FOR INSERT WITH CHECK (
      tenant_id = public.get_current_tenant_id()
      AND public.is_deal_team_member(team_id)
      AND created_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_contact_created
  ON public.meeting_decisions (deal_team_contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_team_created
  ON public.meeting_decisions (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_tenant_created
  ON public.meeting_decisions (tenant_id, created_at DESC);

-- ─── meeting_questions (otwarte/odpowiedziane pytania na spotkania) ─────
CREATE TABLE IF NOT EXISTS public.meeting_questions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL,
  team_id                  uuid NOT NULL,
  deal_team_contact_id     uuid NOT NULL REFERENCES public.deal_team_contacts(id) ON DELETE CASCADE,
  question_text            text NOT NULL,
  status                   text NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','answered','skipped','dropped')),
  answer_text              text,
  ask_count                integer NOT NULL DEFAULT 1,
  last_asked_at            timestamptz NOT NULL DEFAULT now(),
  last_asked_by            uuid,
  answered_at              timestamptz,
  answered_by              uuid,
  created_by               uuid NOT NULL DEFAULT auth.uid(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY meeting_questions_select ON public.meeting_questions
    FOR SELECT USING (
      tenant_id = public.get_current_tenant_id()
      AND public.is_deal_team_member(team_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY meeting_questions_insert ON public.meeting_questions
    FOR INSERT WITH CHECK (
      tenant_id = public.get_current_tenant_id()
      AND public.is_deal_team_member(team_id)
      AND created_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY meeting_questions_update ON public.meeting_questions
    FOR UPDATE
    USING (tenant_id = public.get_current_tenant_id() AND public.is_deal_team_member(team_id))
    WITH CHECK (tenant_id = public.get_current_tenant_id() AND public.is_deal_team_member(team_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_questions_contact_status
  ON public.meeting_questions (deal_team_contact_id, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_meeting_questions_contact_all
  ON public.meeting_questions (deal_team_contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_questions_team_open
  ON public.meeting_questions (team_id, ask_count DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_meeting_questions_tenant
  ON public.meeting_questions (tenant_id, created_at DESC);

-- Trigger updated_at (brak w live — dokładamy przy okazji, tech-debt z backlogu)
DROP TRIGGER IF EXISTS set_meeting_questions_updated_at ON public.meeting_questions;
CREATE TRIGGER set_meeting_questions_updated_at
  BEFORE UPDATE ON public.meeting_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS set_meeting_questions_updated_at ON public.meeting_questions;
-- DROP TABLE IF EXISTS public.meeting_questions;
-- DROP TABLE IF EXISTS public.meeting_decisions;