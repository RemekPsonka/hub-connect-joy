-- Create contact activity log table
CREATE TABLE public.contact_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_contact_activity_log_contact_id ON public.contact_activity_log(contact_id);
CREATE INDEX idx_contact_activity_log_tenant_id ON public.contact_activity_log(tenant_id);
CREATE INDEX idx_contact_activity_log_created_at ON public.contact_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.contact_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Contact activity log tenant access"
ON public.contact_activity_log
FOR ALL
USING (auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id())
WITH CHECK (auth.uid() IS NOT NULL AND tenant_id = get_current_tenant_id());

-- Function to log contact creation
CREATE OR REPLACE FUNCTION public.log_contact_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.contact_activity_log (tenant_id, contact_id, activity_type, description, metadata)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    'created',
    'Kontakt został dodany do systemu',
    jsonb_build_object(
      'source', COALESCE(NEW.source, 'manual'),
      'full_name', NEW.full_name
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for automatic logging on contact creation
CREATE TRIGGER trigger_log_contact_created
AFTER INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.log_contact_created();

-- Migrate existing contacts - create activity log entries for them
INSERT INTO public.contact_activity_log (tenant_id, contact_id, activity_type, description, metadata, created_at)
SELECT 
  tenant_id,
  id,
  'created',
  'Kontakt został dodany do systemu',
  jsonb_build_object('source', COALESCE(source, 'manual'), 'full_name', full_name, 'migrated', true),
  COALESCE(created_at, now())
FROM public.contacts;

-- Also log existing profile_summary as AI check
INSERT INTO public.contact_activity_log (tenant_id, contact_id, activity_type, description, metadata, created_at)
SELECT 
  tenant_id,
  id,
  'ai_profile_generated',
  'Wygenerowano profil AI',
  jsonb_build_object('migrated', true),
  COALESCE(updated_at, now())
FROM public.contacts
WHERE profile_summary IS NOT NULL;