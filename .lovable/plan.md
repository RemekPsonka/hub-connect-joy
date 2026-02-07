

# Izolacja danych -- RLS per dyrektor (kontakty, zadania, projekty)

## Problem

Obecne polityki RLS filtruja dane tylko po `tenant_id` (organizacji). Wszyscy dyrektorzy w tym samym tenancie (Remek, Pawel, Adam) widza **te same** kontakty, zadania i projekty. Powinni widziec tylko swoje.

## Stan obecny vs wymagany

| Tabela | Obecne RLS | Wymagane RLS |
|--------|-----------|-------------|
| `contacts` | `tenant_id = get_current_tenant_id()` -- wszyscy widza wszystko | Tylko wlasne kontakty + udostepnione |
| `tasks` | `owner_id = me OR assigned_to = me OR visibility IN ('team','public') OR owner_id IS NULL` | `owner_id = me OR assigned_to = me` (usunac fallback na NULL i team/public) |
| `projects` | `tenant_id = get_current_tenant_id()` -- wszyscy widza wszystko | `owner_id = me OR member w project_members` |
| `consultations` | `tenant_id = get_current_tenant_id()` | `director_id = me` |
| `needs/offers` | `tenant_id = get_current_tenant_id()` | Przez kontakt -- jesli widze kontakt, widze jego needs/offers |
| `deals` | Juz izolowane: `owner_id = me OR team_member` | Bez zmian -- juz OK |

## Architektura rozwiazania

### 1. Nowa kolumna `director_id` na `contacts`

Dodanie kolumny `director_id uuid REFERENCES directors(id)` wskazujacej wlasciciela kontaktu. Wypelnienie na podstawie grup:

```text
Grupy Remka: "Czlonek CC Remek", "Kontakty biznesowe Remka" -> director_id = 98a271e8...
Grupy Pawla: "Baza kontaktow Pawel", "Czlonek CC Pawel" -> director_id = f6133796...
Wspolne (do Remka): "Baza kontaktow biznesowych" (1940), "Czlonek CC" (16), 
                     "Czlonek CC Katowice" (12), "Inne" (0), "Poznany na CC" (6)
                     -> director_id = 98a271e8... (Remek jako owner)
Kontakty bez grupy: -> director_id = 98a271e8... (Remek jako owner)
```

### 2. Nowa tabela `contact_shares`

Tabela umozliwiajaca udostepnianie kontaktow miedzy dyrektorami:

```text
contact_shares (
  id uuid PK,
  tenant_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  shared_with_director_id uuid NOT NULL REFERENCES directors(id),
  shared_by_director_id uuid NOT NULL REFERENCES directors(id),
  permission text DEFAULT 'read' CHECK ('read','write'),
  created_at timestamptz
  UNIQUE(contact_id, shared_with_director_id)
)
```

### 3. Nowe RLS policies

#### contacts -- SELECT

```text
Nowa polityka "contacts_director_isolation":
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      -- Admin/Owner widzi wszystko w tenancie
      is_tenant_admin(auth.uid(), tenant_id)
      -- Dyrektor widzi swoje kontakty
      OR director_id = get_current_director_id()
      -- Dyrektor widzi udostepnione kontakty
      OR EXISTS (SELECT 1 FROM contact_shares cs 
                 WHERE cs.contact_id = contacts.id 
                 AND cs.shared_with_director_id = get_current_director_id())
      -- Kontakty bez wlasciciela (legacy) -- do owner/admin
      OR director_id IS NULL
    )
  )
```

Istniejace polityki asystentow i przedstawicieli zostaja bez zmian -- dzialaja rownolegle.

#### tasks -- SELECT

```text
Zaktualizowana polityka "Tasks visibility select":
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
      OR assigned_to = get_current_director_id()
    )
  )
  -- Usuniety: OR visibility IN ('team','public') OR owner_id IS NULL
```

#### projects -- SELECT

```text
Nowa polityka "projects_director_isolation":
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR owner_id = get_current_director_id()
      OR EXISTS (SELECT 1 FROM project_members pm 
                 WHERE pm.project_id = projects.id 
                 AND pm.director_id = get_current_director_id())
    )
  )
```

#### consultations

```text
Zaktualizowana polityka:
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), tenant_id)
      OR director_id = get_current_director_id()
    )
  )
```

### 4. Tabele potomne (needs, offers, contact_activity_log, contact_agent_memory)

Te tabele maja `contact_id` -- ich widocznosc bedzie **posrednia przez kontakty**. Zmiana podejscia:

```text
Zamiast: tenant_id = get_current_tenant_id()
Na: EXISTS (SELECT 1 FROM contacts c WHERE c.id = X.contact_id 
    AND c.tenant_id = get_current_tenant_id()
    AND (c.director_id = get_current_director_id() 
         OR is_tenant_admin(auth.uid(), c.tenant_id)
         OR EXISTS (SELECT 1 FROM contact_shares cs ...)))
```

Alternatywnie: uzyjemy funkcji `can_access_contact(contact_id)` aby uniknac powtarzania logiki.

### 5. Funkcja pomocnicza `can_access_contact`

```text
CREATE FUNCTION can_access_contact(_contact_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = _contact_id
    AND c.tenant_id = get_current_tenant_id()
    AND (
      is_tenant_admin(auth.uid(), c.tenant_id)
      OR c.director_id = get_current_director_id()
      OR EXISTS (SELECT 1 FROM contact_shares cs 
                 WHERE cs.contact_id = c.id 
                 AND cs.shared_with_director_id = get_current_director_id())
      OR c.director_id IS NULL
    )
  )
$$;
```

### 6. UI -- przycisk "Udostepnij" na kontakcie

W `ContactDetailHeader.tsx` dodamy przycisk "Udostepnij" otwierajacy dialog z lista dyrektorow. Po wybraniu -> INSERT do `contact_shares`.

## Kolejnosc wykonania

```text
Migracja SQL (atomowa):
1. ALTER TABLE contacts ADD COLUMN director_id uuid REFERENCES directors(id)
2. UPDATE contacts SET director_id = ... (na podstawie grup)
3. CREATE TABLE contact_shares + RLS
4. CREATE FUNCTION can_access_contact()
5. DROP POLICY + CREATE POLICY na: contacts, tasks, projects, consultations
6. Zaktualizuj policies na: needs, offers, contact_activity_log, contact_agent_memory
7. CREATE INDEX na contacts(director_id), contact_shares(contact_id, shared_with_director_id)
```

```text
Frontend:
8. Hook useContactShares (udostepnianie)
9. Przycisk "Udostepnij" w ContactDetailHeader
10. Dialog wyboru dyrektora do udostepnienia
```

## Tabele dotykane zmianami RLS

| Tabela | Zmiana |
|--------|--------|
| `contacts` | Nowa kolumna `director_id` + nowa polityka SELECT z izolacja |
| `contact_shares` | Nowa tabela |
| `tasks` | Zmiana polityki SELECT -- usunac fallback NULL i team/public |
| `projects` | Nowa polityka SELECT -- owner_id lub project_members |
| `consultations` | Zmiana polityki -- dodac director_id check |
| `needs` | Zmiana polityki -- przez can_access_contact() |
| `offers` | Zmiana polityki -- przez can_access_contact() |
| `contact_activity_log` | Zmiana polityki -- przez can_access_contact() |
| `contact_agent_memory` | Zmiana polityki -- przez can_access_contact() |
| `business_interviews` | Zmiana polityki -- przez can_access_contact() |

## Co NIE zostanie zmienione

| Element | Powod |
|---------|-------|
| `deals` | Juz izolowane (owner_id + team_member) |
| `deal_stages` | Konfiguracja per tenant -- poprawne |
| `deal_activities/products` | Dziedzicza dostep przez deals -- poprawne |
| Istniejace polityki asystentow | Dzialaja rownolegle -- bez zmian |
| Istniejace polityki przedstawicieli | Dzialaja rownolegle -- bez zmian |
| `companies` | Wspolne zasoby -- izolacja per tenant wystarczy |

## Bezpieczenstwo

- Admin/Owner (`is_tenant_admin`) ZAWSZE widzi wszystkie dane w tenancie
- Dyrektor widzi TYLKO swoje kontakty + udostepnione
- SGU jest traktowany jak zwykly dyrektor -- widzi tylko swoje
- Kontakty bez `director_id` (NULL) sa widoczne dla admina -- fallback bezpieczenstwa
- `can_access_contact` jest SECURITY DEFINER -- bezpieczne wywolanie z RLS
- `contact_shares` ma wlasne RLS -- kazdy widzi tylko udostepnienia do siebie

## Dane do migracji (przypisanie kontaktow)

```text
Remek (98a271e8): 
  - Grupy: "Czlonek CC Remek" (15), "Kontakty biznesowe Remka" (72)
  - Wspolne (owner): "Baza kontaktow biznesowych" (1940), "Czlonek CC" (16), 
    "Czlonek CC Katowice" (12), "Inne" (0), "Poznany na CC" (6)
  - Kontakty bez grupy
  Lacznie: ~2061

Pawel (f6133796):
  - Grupy: "Baza kontaktow Pawel" (0), "Czlonek CC Pawel" (0)
  Lacznie: 0 (grupy puste)

Adam (47700bf1):
  - Brak przypisanych grup
  Lacznie: 0
```
