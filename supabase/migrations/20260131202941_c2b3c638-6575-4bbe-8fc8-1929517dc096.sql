-- Dodaj pole do rozróżnienia "naszych" polis od "obcych"
ALTER TABLE public.insurance_policies
ADD COLUMN IF NOT EXISTS is_our_policy BOOLEAN DEFAULT false;

-- Dodaj pole workflow status dla lejka
ALTER TABLE public.insurance_policies
ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'backlog';

-- Dodaj datę przejęcia do finalizacji
ALTER TABLE public.insurance_policies
ADD COLUMN IF NOT EXISTS moved_to_finalization_at TIMESTAMPTZ;

-- Dodaj datę zamknięcia
ALTER TABLE public.insurance_policies
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Indeks dla szybkich raportów
CREATE INDEX IF NOT EXISTS idx_insurance_policies_workflow ON public.insurance_policies(tenant_id, workflow_status, end_date);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_our ON public.insurance_policies(tenant_id, is_our_policy);