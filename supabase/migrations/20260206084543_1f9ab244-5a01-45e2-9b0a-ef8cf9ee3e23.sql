-- 1. Funkcja pomocnicza has_role_sgu
CREATE OR REPLACE FUNCTION has_role_sgu(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = 'sgu'
  )
$$;

-- 2. Wzmocnienie polityki deals_update
DROP POLICY IF EXISTS deals_update ON deals;
CREATE POLICY deals_update ON deals FOR UPDATE TO authenticated
USING (tenant_id = get_current_tenant_id())
WITH CHECK (
  tenant_id = get_current_tenant_id() AND (
    is_tenant_admin(auth.uid(), tenant_id) OR
    (team_id IS NULL AND owner_id = (SELECT id FROM directors WHERE user_id = auth.uid() LIMIT 1)) OR
    (team_id IS NOT NULL AND is_deal_team_member(auth.uid(), team_id))
  )
);

-- 3. Tabela audytu zmian ról
CREATE TABLE role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL,
  changed_by_user_id uuid NOT NULL,
  action text NOT NULL,
  old_role app_role,
  new_role app_role,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS dla role_audit_log
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_audit_log_select ON role_audit_log
FOR SELECT TO authenticated
USING (tenant_id = get_current_tenant_id() AND is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY role_audit_log_insert ON role_audit_log
FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin(auth.uid(), tenant_id));

-- 5. Indeksy
CREATE INDEX idx_role_audit_tenant ON role_audit_log(tenant_id);
CREATE INDEX idx_role_audit_target ON role_audit_log(target_user_id);
CREATE INDEX idx_role_audit_created ON role_audit_log(created_at DESC);

-- 6. Trigger logujący zmiany ról
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, new_role)
    VALUES (NEW.tenant_id, NEW.user_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'role_added', NEW.role);
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, old_role, new_role)
    VALUES (NEW.tenant_id, NEW.user_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'role_changed', OLD.role, NEW.role);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, old_role)
    VALUES (OLD.tenant_id, OLD.user_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), 'role_removed', OLD.role);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_role_audit
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION log_role_change();