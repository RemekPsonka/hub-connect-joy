ALTER TABLE public.meeting_prospects ADD COLUMN ai_brief TEXT DEFAULT NULL;
ALTER TABLE public.meeting_prospects ADD COLUMN ai_brief_generated_at TIMESTAMPTZ DEFAULT NULL;