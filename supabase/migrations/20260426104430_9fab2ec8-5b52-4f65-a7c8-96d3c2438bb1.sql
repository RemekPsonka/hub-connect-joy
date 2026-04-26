-- Etap 4 / Sprint S5 — UNIFY-MEETING-OUTCOME
-- Rozszerzenie trigera apply_meeting_decision o gałęzie 'pivot' (cold) i 'nurture' (10x).
-- Warunkowe zamykanie follow_up_task_id rozszerzone o 'pivot' (NIE dla 'push' i 'nurture').
--
-- ROLLBACK:
--   Przywróć poprzednią wersję funkcji apply_meeting_decision z migracji
--   <wcześniejsza migracja zawierająca FIX #27a/#27b + S2-mini push/kill>.
--   Trigger meeting_decisions_after_insert_apply pozostaje (wskazuje na tę funkcję).

CREATE OR REPLACE FUNCTION public.apply_meeting_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.decision_type = 'go' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date    = NEW.next_action_date,
           k1_meeting_done_at  = COALESCE(k1_meeting_done_at, now()),
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'postponed' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date    = NEW.postponed_until,
           k1_meeting_done_at  = COALESCE(k1_meeting_done_at, now()),
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type IN ('dead', 'kill') THEN
    UPDATE public.deal_team_contacts
       SET is_lost            = true,
           lost_reason        = NEW.dead_reason,
           lost_at            = COALESCE(lost_at, now()),
           category           = 'lost',
           status             = 'disqualified',
           next_action_date   = NULL,
           next_action        = NULL,
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'push' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date = COALESCE(
             NEW.postponed_until,
             (NEW.decision_data->>'postponed_until')::date,
             (now() + interval '7 days')::date
           ),
           snoozed_until    = COALESCE(
             NEW.postponed_until::timestamptz,
             (NEW.decision_data->>'postponed_until')::timestamptz,
             now() + interval '7 days'
           ),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'pivot' THEN
    -- S5: "Wraca do Cold" — reset etapu do decision_meeting; NIE stempluj K1.
    UPDATE public.deal_team_contacts
       SET offering_stage     = 'decision_meeting',
           next_action_date   = COALESCE(NEW.next_action_date, (now() + interval '7 days')::date),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'nurture' THEN
    -- S5: "10x — relacja długoterminowa". Stage zostaje (jeśli już meeting_done — stempel K1 zachowany).
    UPDATE public.deal_team_contacts
       SET category           = '10x',
           k1_meeting_done_at = COALESCE(k1_meeting_done_at, now()),
           next_action_date   = COALESCE(NEW.next_action_date, (now() + interval '30 days')::date),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;
  END IF;
  -- park: legacy no-op.

  -- Warunkowe zamykanie konkretnego follow-up taska.
  -- S5: dorzucamy 'pivot' do listy decyzji kończących task (cold = bieżący task już nieaktualny).
  -- Nie zamykamy dla 'push' (przesunięcie) ani 'nurture' (długoterminowa relacja).
  IF NEW.follow_up_task_id IS NOT NULL
     AND NEW.decision_type IN ('go','dead','kill','pivot')
  THEN
    UPDATE public.tasks
       SET status = 'completed', updated_at = now()
     WHERE id = NEW.follow_up_task_id
       AND status IS DISTINCT FROM 'completed';
  END IF;

  RETURN NEW;
END;
$function$;