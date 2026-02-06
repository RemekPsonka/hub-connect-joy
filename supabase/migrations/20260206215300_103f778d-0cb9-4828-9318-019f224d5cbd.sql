
-- Create sovra_report_config table for weekly/daily report settings
CREATE TABLE IF NOT EXISTS public.sovra_report_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  director_id uuid NOT NULL REFERENCES directors(id),
  enabled boolean DEFAULT false,
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  day_of_week int2 DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  time_of_day time DEFAULT '08:00',
  email_override text,
  include_sections jsonb DEFAULT '["summary","tasks","projects","contacts","calendar"]',
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, director_id)
);

-- Enable RLS
ALTER TABLE public.sovra_report_config ENABLE ROW LEVEL SECURITY;

-- RLS policy: directors can only manage their own config
CREATE POLICY "sovra_report_config_own" ON public.sovra_report_config
  FOR ALL USING (
    tenant_id = get_current_tenant_id() 
    AND director_id = get_current_director_id()
  );

-- Trigger for updated_at
CREATE TRIGGER update_sovra_report_config_updated_at
  BEFORE UPDATE ON public.sovra_report_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
