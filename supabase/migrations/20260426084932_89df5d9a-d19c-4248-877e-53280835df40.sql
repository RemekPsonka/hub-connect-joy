-- S2-mini: aktywna gałąź push w apply_meeting_decision + alias kill obok dead
-- ROLLBACK: przywróć poprzednią wersję funkcji (3 gałęzie: go, postponed, dead) bez push i bez aliasu kill.

CREATE OR REPLACE FUNCTION public.apply_meeting_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- FIX #27a: NEW.dead_reason (kolumna na meeting_decisions to dead_reason, nie lost_reason)
    -- FIX #27b: deal_stage to kolumna GENERATED ALWAYS z category — nie wolno jej ustawiać
    -- S2-mini: alias 'kill' obok 'dead' (UI wysyła 'kill')
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

  ELSIF NEW.decision_type = 'push' THEN
    -- S2-mini: aktywna gałąź push (wcześniej NO-OP)
    -- preferuje NEW.postponed_until (kolumna), fallback na decision_data->>'postponed_until', fallback +7d
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
  END IF;
  -- park / pivot: legacy no-op (UI nie wysyła; AI proposal może wysyłać — bez efektu w DB)

  -- FIX #23 (CLEANUP-BUGS-01): zamykamy tylko konkretny follow_up_task_id
  -- i tylko gdy decyzja oznacza zakończenie taska (NIE 'push' — push przesuwa task, nie kończy go).
  IF NEW.follow_up_task_id IS NOT NULL
     AND NEW.decision_type IN ('go','dead','kill')
  THEN
    UPDATE public.tasks
       SET status = 'completed', updated_at = now()
     WHERE id = NEW.follow_up_task_id
       AND status IS DISTINCT FROM 'completed';
  END IF;

  RETURN NEW;
END;
$$;