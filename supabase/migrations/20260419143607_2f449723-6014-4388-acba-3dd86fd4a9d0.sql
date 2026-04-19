CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  target_user_id uuid NOT NULL,
  changed_by_user_id uuid NOT NULL,
  action text NOT NULL,
  old_role text,
  new_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read role audit"
ON public.role_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), NULL::uuid, 'owner'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_role_audit_target ON public.role_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_tenant ON public.role_audit_log(tenant_id);