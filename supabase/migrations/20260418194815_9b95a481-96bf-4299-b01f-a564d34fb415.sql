ALTER TABLE public.meeting_participants
  DROP CONSTRAINT IF EXISTS meeting_participants_prospect_id_fkey;

ALTER TABLE public.meeting_participants
  ADD CONSTRAINT meeting_participants_prospect_id_fkey
  FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE SET NULL;