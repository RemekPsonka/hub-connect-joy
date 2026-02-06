

# Plan wdrożenia zmian uprawnień i audytu

## 1. Wzmocnienie polityki `deals_update` RLS

### Problem
Obecna polityka `deals_update` pozwala **każdemu dyrektorowi** w tenant aktualizować **dowolny deal**:
```sql
-- Aktualna (zbyt luźna):
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id() AND EXISTS(SELECT 1 FROM directors WHERE user_id = auth.uid()))
```

### Rozwiązanie
Zastąpienie jej ściślejszą wersją, która pozwala na update tylko:
- Adminowi tenant (może wszystko)
- Właścicielowi deala (`owner_id`)
- Członkowi zespołu przypisanego do deala (`team_id`)

```sql
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
```

---

## 2. Formalizacja roli SGU w enumie `app_role`

### Problem
"SGU" funkcjonuje jako zespół w `deal_teams`, ale nie jako formalna rola systemowa. Rozszerzenie enum pozwoli na dedykowane uprawnienia.

### Rozwiązanie

**Krok 1: Rozszerzenie enumu**
```sql
ALTER TYPE app_role ADD VALUE 'sgu' AFTER 'director';
```

**Krok 2: Update hooków i UI**
- `src/hooks/useOwnerPanel.ts`: dodanie `'sgu'` do typu `AppRole`
- `src/pages/Owner.tsx`: dodanie labela "SGU" i badge variant
- `src/components/owner/AddUserModal.tsx`: dodanie opcji SGU przy tworzeniu użytkownika
- `supabase/functions/create-tenant-user/index.ts`: rozszerzenie walidacji Zod o `'sgu'`

**Krok 3: Funkcja sprawdzająca rolę SGU**
```sql
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
```

---

## 3. Implementacja audytu zmian ról

### Problem
Brak śladu audytowego przy zmianach ról użytkowników.

### Rozwiązanie

**Krok 1: Utworzenie tabeli audytu**
```sql
CREATE TABLE role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL,
  changed_by_user_id uuid NOT NULL,
  action text NOT NULL, -- 'role_added', 'role_removed', 'role_changed'
  old_role app_role,
  new_role app_role,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_audit_log_select ON role_audit_log
FOR SELECT TO authenticated
USING (tenant_id = get_current_tenant_id() AND is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY role_audit_log_insert ON role_audit_log
FOR INSERT TO authenticated
WITH CHECK (tenant_id = get_current_tenant_id() AND is_tenant_admin(auth.uid(), tenant_id));

CREATE INDEX idx_role_audit_tenant ON role_audit_log(tenant_id);
CREATE INDEX idx_role_audit_target ON role_audit_log(target_user_id);
```

**Krok 2: Trigger na tabeli `user_roles`**
```sql
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, new_role)
    VALUES (NEW.tenant_id, NEW.user_id, auth.uid(), 'role_added', NEW.role);
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, old_role, new_role)
    VALUES (NEW.tenant_id, NEW.user_id, auth.uid(), 'role_changed', OLD.role, NEW.role);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO role_audit_log (tenant_id, target_user_id, changed_by_user_id, action, old_role)
    VALUES (OLD.tenant_id, OLD.user_id, auth.uid(), 'role_removed', OLD.role);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_role_audit
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION log_role_change();
```

**Krok 3: UI do przeglądania logów**

Nowy komponent `src/components/owner/RoleAuditLog.tsx`:
- Hook `useRoleAuditLog()` pobierający logi z tabeli
- Tabela z kolumnami: Data, Użytkownik, Akcja, Poprzednia rola, Nowa rola, Zmienione przez

Integracja w `src/pages/Owner.tsx`:
- Nowa sekcja "Historia zmian ról" na końcu strony

---

## Pliki do modyfikacji

| Plik | Operacja | Opis |
|------|----------|------|
| Migracja SQL | Nowa | Rozszerzenie enumu, tabela audytu, trigger, RLS |
| `src/hooks/useOwnerPanel.ts` | Modyfikacja | Dodanie `'sgu'` do typu AppRole |
| `src/pages/Owner.tsx` | Modyfikacja | Label i badge dla SGU |
| `src/components/owner/AddUserModal.tsx` | Modyfikacja | Opcja SGU w select |
| `supabase/functions/create-tenant-user/index.ts` | Modyfikacja | Walidacja SGU w Zod |
| `src/hooks/useRoleAuditLog.ts` | Nowy | Hook do pobierania logów |
| `src/components/owner/RoleAuditLog.tsx` | Nowy | UI wyświetlania logów |

---

## Diagram struktury po zmianach

```text
┌──────────────────────────────────────────────────────────────┐
│  app_role (enum)                                             │
│  ├── owner    → Pełne uprawnienia                           │
│  ├── admin    → Zarządzanie użytkownikami + wszystkie deals │
│  ├── sgu      → [NOWY] Dedykowana rola dla zespołów SGU     │
│  └── director → Własne deals lub z przypisanych zespołów    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  deals RLS (UPDATE)                                          │
│  ├── is_tenant_admin? → ✓ Może aktualizować                 │
│  ├── owner_id = current_director? → ✓ Może aktualizować     │
│  └── is_deal_team_member? → ✓ Może aktualizować             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  role_audit_log (tabela)                                     │
│  ├── target_user_id, changed_by_user_id                     │
│  ├── action: role_added | role_changed | role_removed       │
│  └── old_role, new_role, created_at                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Efekt końcowy

1. **Bezpieczeństwo deals**: Dyrektor może edytować tylko deale, których jest właścicielem lub do których należy przez zespół
2. **Formalna rola SGU**: Możliwość tworzenia użytkowników z dedykowaną rolą SGU w panelu zarządzania
3. **Pełny audyt**: Każda zmiana roli jest logowana z informacją kto, kiedy i co zmienił

