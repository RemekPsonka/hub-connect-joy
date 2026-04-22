-- =====================================================================
-- N-apply: Trigger AFTER INSERT ON meeting_decisions
--          → UPDATE deal_team_contacts (apply decision)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.apply_meeting_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.decision_type = 'go' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date   = NEW.next_action_date,
           k1_meeting_done_at = COALESCE(k1_meeting_done_at, NEW.meeting_date::timestamptz),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'postponed' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date   = NEW.postponed_until,
           k1_meeting_done_at = COALESCE(k1_meeting_done_at, NEW.meeting_date::timestamptz),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'dead' THEN
    UPDATE public.deal_team_contacts
       SET is_lost            = true,
           lost_reason         = NEW.dead_reason,
           lost_at             = now(),
           category            = 'lost',
           deal_stage          = 'lost',
           status              = 'disqualified',
           next_action_date    = NULL,
           next_action         = NULL,
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_meeting_decision ON public.meeting_decisions;

CREATE TRIGGER trg_apply_meeting_decision
AFTER INSERT ON public.meeting_decisions
FOR EACH ROW
EXECUTE FUNCTION public.apply_meeting_decision();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_apply_meeting_decision ON public.meeting_decisions;
-- DROP FUNCTION IF EXISTS public.apply_meeting_decision();
