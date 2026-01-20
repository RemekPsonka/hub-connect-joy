-- Add missing columns for improved contact merging from business cards
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address_secondary TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email_secondary TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.address IS 'Primary address';
COMMENT ON COLUMN public.contacts.address_secondary IS 'Secondary address (e.g., from business card if different from primary)';
COMMENT ON COLUMN public.contacts.email_secondary IS 'Secondary email (e.g., from business card if different from primary)';