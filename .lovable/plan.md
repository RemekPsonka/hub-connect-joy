
# Naprawa RLS policy dla tabeli meeting_prospects

## Problem
Polityki RLS na tabeli `meeting_prospects` uzywaja blednego zapytania:
```sql
tenant_id = (SELECT tenant_id FROM directors WHERE id = auth.uid())
```
Powinno byc `directors.user_id = auth.uid()` (bo `directors.id` to inny UUID niz `auth.uid()`). Przez to INSERT jest blokowany -- stad 0 rekordow w tabeli mimo poprawnego parsowania.

Inne tabele (np. `deal_team_prospects`) uzywaja funkcji `get_current_tenant_id()` ktora poprawnie sprawdza `directors.user_id = auth.uid()` i obsluguje tez asystentow.

## Rozwiazanie
Jedna migracja SQL -- usunac stare polityki i stworzyc nowe uzywajace `get_current_tenant_id()`, wzorowane na `deal_team_prospects`.

### Migracja SQL:
```sql
-- Drop old broken policies
DROP POLICY IF EXISTS "Tenant members can view meeting prospects" ON meeting_prospects;
DROP POLICY IF EXISTS "Tenant members can insert meeting prospects" ON meeting_prospects;
DROP POLICY IF EXISTS "Tenant members can update meeting prospects" ON meeting_prospects;
DROP POLICY IF EXISTS "Tenant members can delete meeting prospects" ON meeting_prospects;

-- Create corrected policies using get_current_tenant_id()
CREATE POLICY "mp_select" ON meeting_prospects FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "mp_insert" ON meeting_prospects FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "mp_update" ON meeting_prospects FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "mp_delete" ON meeting_prospects FOR DELETE
  USING (tenant_id = get_current_tenant_id());
```

## Zmiany w kodzie
Brak -- jedynie migracja bazy danych. Kod frontendowy i edge function sa poprawne.

## Pliki
| Plik | Akcja |
|------|-------|
| Migracja SQL | Nowe polityki RLS |
