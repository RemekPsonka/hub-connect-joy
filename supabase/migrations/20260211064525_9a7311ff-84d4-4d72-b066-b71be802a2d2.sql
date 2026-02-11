
ALTER TABLE public.deal_team_contacts
ADD COLUMN ai_brief text,
ADD COLUMN ai_brief_generated_at timestamptz;
