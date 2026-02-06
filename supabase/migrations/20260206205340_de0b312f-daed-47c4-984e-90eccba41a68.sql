
-- Fix: Make log_role_change handle deletions gracefully (check if tenant still exists)
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check tenant exists before logging
    IF EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
      INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, new_role)
      VALUES (NEW.tenant_id, NEW.user_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'role_added', NEW.role);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
      INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, old_role, new_role)
      VALUES (NEW.tenant_id, NEW.user_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'role_changed', OLD.role, NEW.role);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.tenants WHERE id = OLD.tenant_id) THEN
      INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, old_role)
      VALUES (OLD.tenant_id, OLD.user_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'role_removed', OLD.role);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Now delete the orphan tenant (cascade won't cause FK issues)
DELETE FROM public.tenants WHERE id = 'ca4b7fec-820a-4385-a767-037a0bceb0d7';
