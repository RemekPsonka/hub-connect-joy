
-- Add foreign keys to meeting_participants for PostgREST joins
ALTER TABLE public.meeting_participants
  ADD CONSTRAINT fk_meeting_participants_contact
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_participants
  ADD CONSTRAINT fk_meeting_participants_prospect
  FOREIGN KEY (prospect_id) REFERENCES public.meeting_prospects(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_participants
  ADD CONSTRAINT fk_meeting_participants_meeting
  FOREIGN KEY (meeting_id) REFERENCES public.group_meetings(id) ON DELETE CASCADE;
