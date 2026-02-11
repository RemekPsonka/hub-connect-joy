
-- Add meeting_id to meeting_prospects to link prospects with meetings
ALTER TABLE public.meeting_prospects
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.group_meetings(id) ON DELETE SET NULL;

-- Add prospect_id to meeting_participants to link participants with prospect records
ALTER TABLE public.meeting_participants
ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES public.meeting_prospects(id) ON DELETE SET NULL;

-- Make contact_id nullable in meeting_participants (prospects don't have a contact yet)
ALTER TABLE public.meeting_participants
ALTER COLUMN contact_id DROP NOT NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meeting_prospects_meeting_id ON public.meeting_prospects(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_prospect_id ON public.meeting_participants(prospect_id);
