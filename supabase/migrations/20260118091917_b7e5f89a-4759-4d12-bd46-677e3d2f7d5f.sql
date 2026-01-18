-- Add met_source and met_date fields to contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS met_source TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS met_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.met_source IS 'Where we met this contact, e.g., CC, EKG, NARVIL2025';
COMMENT ON COLUMN public.contacts.met_date IS 'Date when we met this contact';