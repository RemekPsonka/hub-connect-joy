ALTER TABLE public.odprawa_sessions
  ADD COLUMN IF NOT EXISTS current_contact_id uuid
    REFERENCES public.deal_team_contacts(id) ON DELETE SET NULL;

ALTER TABLE public.odprawa_sessions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;