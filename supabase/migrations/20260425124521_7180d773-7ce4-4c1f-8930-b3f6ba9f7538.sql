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
  ELSIF NEW.decision_type = 'dead' THEN
    -- FIX #27a: NEW.dead_reason (kolumna na meeting_decisions to dead_reason, nie lost_reason)
    -- FIX #27b: deal_stage to kolumna GENERATED ALWAYS z category — nie wolno jej ustawiać
    UPDATE public.deal_team_contacts
       SET is_lost            = true,
           lost_reason        = NEW.dead_reason,
           lost_at            = now(),
           category           = 'lost',
           status             = 'disqualified',
           next_action_date   = NULL,
           next_action        = NULL,
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;
  END IF;

  -- FIX #23 (CLEANUP-BUGS-01): zamykamy tylko konkretny follow_up_task_id
  -- i tylko gdy decyzja oznacza zakończenie taska (NIE 'push' — push tworzy nowy task).
  IF NEW.follow_up_task_id IS NOT NULL
     AND NEW.decision_type IN ('go','dead')
  THEN
    UPDATE public.tasks
       SET status = 'completed', updated_at = now()
     WHERE id = NEW.follow_up_task_id
       AND status IS DISTINCT FROM 'completed';
  END IF;

  RETURN NEW;
END;
$function$;

-- ROLLBACK: poprzednia wersja z UPDATE deal_stage='lost' (rzuca 428C9, niegrywalna).