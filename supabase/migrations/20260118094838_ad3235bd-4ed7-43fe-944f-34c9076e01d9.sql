-- Create default_positions table for managing position suggestions
CREATE TABLE public.default_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_positions ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "tenant_access" ON public.default_positions
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create index for faster lookups
CREATE INDEX idx_default_positions_tenant ON public.default_positions(tenant_id);

-- Create function to seed default positions for new tenants
CREATE OR REPLACE FUNCTION public.seed_default_positions_for_tenant(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.default_positions (tenant_id, name, sort_order, is_default) VALUES
    (p_tenant_id, 'Właściciel', 1, false),
    (p_tenant_id, 'Prezes', 2, false),
    (p_tenant_id, 'Dyrektor', 3, false),
    (p_tenant_id, 'Menedżer', 4, false),
    (p_tenant_id, 'Specjalista', 5, false),
    (p_tenant_id, 'Inny', 99, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Seed default positions for all existing tenants
INSERT INTO public.default_positions (tenant_id, name, sort_order, is_default)
SELECT t.id, pos.name, pos.sort_order, pos.is_default
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Właściciel', 1, false),
    ('Prezes', 2, false),
    ('Dyrektor', 3, false),
    ('Menedżer', 4, false),
    ('Specjalista', 5, false),
    ('Inny', 99, true)
) AS pos(name, sort_order, is_default);