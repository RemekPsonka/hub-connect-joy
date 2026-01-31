-- Password policy table for 30-day expiration
CREATE TABLE public.user_password_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  password_expiry_days INTEGER NOT NULL DEFAULT 30,
  is_oauth_user BOOLEAN DEFAULT false,
  force_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_password_policy UNIQUE (user_id)
);

-- Index for faster lookups
CREATE INDEX idx_user_password_policies_user_id ON public.user_password_policies(user_id);

-- RLS
ALTER TABLE public.user_password_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own password policy"
  ON public.user_password_policies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own password policy"
  ON public.user_password_policies
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (for trigger)
CREATE POLICY "Service can insert password policy"
  ON public.user_password_policies
  FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_user_password_policies_updated_at
  BEFORE UPDATE ON public.user_password_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Security fix: Restrict search_synonyms access
DROP POLICY IF EXISTS "Public read access" ON public.search_synonyms;
DROP POLICY IF EXISTS "Directors can manage synonyms" ON public.search_synonyms;

CREATE POLICY "Authenticated users can read synonyms"
  ON public.search_synonyms
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Superadmins can manage synonyms"
  ON public.search_synonyms
  FOR ALL
  USING (is_superadmin());