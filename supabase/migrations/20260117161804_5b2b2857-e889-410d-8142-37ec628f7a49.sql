-- Create companies table for storing detailed company information
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  nip TEXT,
  regon TEXT,
  krs TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Polska',
  website TEXT,
  industry TEXT,
  description TEXT,
  employee_count TEXT,
  ai_analysis TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for companies
CREATE POLICY "tenant_access" ON public.companies
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- Add company_id to contacts table
ALTER TABLE public.contacts ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Create index for faster lookups
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX idx_companies_name ON public.companies(name);

-- Create trigger for updated_at on companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();