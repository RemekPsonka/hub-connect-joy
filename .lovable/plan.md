
## Plan: Rozbudowa Dashboardu i Systemu Zarządzania Relacjami

### Podsumowanie zmian
Plan obejmuje:
1. **Reorganizację Dashboard** - nowy układ priorytetów
2. **Rozbudowę systemu siły relacji** - kategorie odświeżania wg typu kontaktu
3. **Nową rolę "Przedstawiciele/Ambasadorzy"** - ograniczony dostęp do kontaktów z workflow przekazywania

---

## Część 1: Reorganizacja Dashboard

### Obecny układ (do zmiany)
```text
[Odkrycie Dnia - full width]          ← PRZENIEŚ NA DÓŁ
[Kontakty do odnowienia]              ← PRZENIEŚ NA DÓŁ
[KPI | Moje | Zespołowe]
[Konsultacje | Spotkania | Dopasowania | Sieć]
[Analityka sieci]
[Priorytety | AI | Alerty]
```

### Nowy układ
```text
+---------------------------------------------------------------+
| STATYSTYKI (bez zmian)                                        |
+---------------------------------------------------------------+
| SZYBKIE AKCJE (bez zmian)                                     |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
| 📋 ZADANIA                                                    |
+---------------------------------------------------------------+
| [KPI Tasks]    [Moje zadania]    [Zadania zespołowe]          |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
| 📊 KONSULTACJE I SPOTKANIA                                    |
+---------------------------------------------------------------+
| [Nadchodzące konsultacje] | [Przegląd spotkań grupowych]      |
| [Dopasowania AI]          | [Przegląd sieci]                  |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
| 📈 ANALITYKA SIECI KONTAKTÓW                 ← ZMIANA NAZWY   |
+---------------------------------------------------------------+
| (pełna szerokość)                                              |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
| 🎯 ZARZĄDZANIE RELACJAMI                                      |
+---------------------------------------------------------------+
| [Priorytety dnia] | [Rekomendacje AI] | [Alerty relacji]      |
+---------------------------------------------------------------+

+---------------------------------------------------------------+
| ⬇ DÓŁ STRONY - MNIEJ PILNE                                   |
+---------------------------------------------------------------+
| [🌟 Odkrycie Dnia]        | [📞 Kontakty do odnowienia]       |
| (pół szerokości)          | (pół szerokości)                  |
+---------------------------------------------------------------+
```

### Plik: `src/pages/Dashboard.tsx`
Zmiany kolejności widgetów:
- Przeniesienie `<DailySerendipity />` na koniec
- Przeniesienie `<ContactsToRenew />` na koniec
- Umieszczenie obu obok siebie w grid 2 kolumn

### Plik: `src/components/dashboard/AnalyticsOverview.tsx`
Zmiana tytułu:
- "Analityka sieci" → "Analityka sieci kontaktów"

---

## Część 2: Rozbudowa Systemu Siły Relacji

### A. Rozszerzenie tabeli `contact_groups` o politykę odświeżania

```sql
ALTER TABLE public.contact_groups 
ADD COLUMN refresh_policy text DEFAULT 'quarterly' 
  CHECK (refresh_policy IN ('monthly', 'quarterly', 'biannual', 'annual', 'never')),
ADD COLUMN refresh_days integer DEFAULT 90,
ADD COLUMN include_in_health_stats boolean DEFAULT true;
```

| Polityka | Dni | Opis |
|----------|-----|------|
| monthly | 30 | Bliscy znajomi, klienci premium |
| quarterly | 90 | Klienci, członkowie CC |
| biannual | 180 | B2B średni poziom |
| annual | 365 | Kontakty okazjonalne |
| never | NULL | Pomijane w statystykach (np. kontakty z telefonu) |

### B. Konfiguracja grup w panelu admina

**Nowy komponent**: `src/components/settings/GroupRefreshPolicyEditor.tsx`

```text
+---------------------------------------------------------------+
| GRUPY KONTAKTÓW - POLITYKA ODŚWIEŻANIA              [Zapisz]  |
+---------------------------------------------------------------+
| Grupa                        | Częstotliwość  | W statyst.    |
+---------------------------------------------------------------+
| 🟡 Członek CC Remek          | [Kwartalnie ▼] | [✓]          |
| 🔵 Członek CC Katowice       | [Kwartalnie ▼] | [✓]          |
| 🔴 Baza kontaktów biznesowych| [Pomijaj    ▼] | [○]          |
| 🟣 Kontakty biznesowe Remka  | [Rocznie    ▼] | [✓]          |
| ⚪ Inne                       | [Pomijaj    ▼] | [○]          |
+---------------------------------------------------------------+
```

### C. Aktualizacja `useAnalytics.ts` - Network Health

Zmiana logiki `calculateNetworkHealth`:
1. Pobierz grupy kontaktów z ich `refresh_days`
2. Dla każdego kontaktu sprawdź jego `primary_group_id`
3. Porównaj `days_since_contact` z `refresh_days` grupy
4. Pomiń kontakty z grup gdzie `include_in_health_stats = false`

```text
Logika:
- Zdrowy: days_since_contact < refresh_days grupy
- Ostrzeżenie: days_since_contact >= refresh_days && < refresh_days * 1.5
- Krytyczny: days_since_contact >= refresh_days * 1.5
```

### D. Aktualizacja `useRelationshipHealth.ts`

Podobna zmiana - uwzględnienie polityki grupy przy obliczaniu alertów.

### E. Aktualizacja `ContactsToRenew.tsx`

Filtrowanie kontaktów na podstawie polityki grupy, nie stałych 60 dni.

---

## Część 3: Nowa Rola - Przedstawiciele Handlowi / Ambasadorzy

### A. Nowa tabela `sales_representatives`

```sql
CREATE TABLE public.sales_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_director_id uuid REFERENCES public.directors(id) NOT NULL,
  tenant_id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role_type text DEFAULT 'sales_rep' CHECK (role_type IN ('sales_rep', 'ambassador')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(email, tenant_id)
);
```

### B. Tabela przypisania kontaktów do przedstawicieli

```sql
CREATE TABLE public.representative_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid REFERENCES public.sales_representatives(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES public.directors(id) NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'reclaimed', 'completed')),
  deadline_days integer DEFAULT 14,
  deadline_at date,
  extended_count integer DEFAULT 0,
  notes text,
  UNIQUE(representative_id, contact_id)
);
```

### C. Widok przedstawiciela - ograniczony dostęp

Przedstawiciel widzi:
- ✓ Dane podstawowe kontaktu (imię, firma, email, telefon)
- ✓ Analizę AI firmy (jeśli istnieje)
- ✓ Swoje własne notatki i konsultacje
- ✗ Notatki dyrektora
- ✗ Konsultacje dyrektora
- ✗ Historię aktywności

### D. RLS Policies

```sql
-- Przedstawiciele widzą tylko przypisane kontakty
CREATE POLICY "Sales reps see assigned contacts" ON public.contacts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM representative_contacts rc
    JOIN sales_representatives sr ON sr.id = rc.representative_id
    WHERE rc.contact_id = contacts.id
    AND sr.user_id = auth.uid()
    AND rc.status = 'active'
  )
);

-- Ukryj notatki dyrektora dla przedstawicieli
CREATE POLICY "Sales reps cannot see director notes" ON public.consultations
FOR SELECT USING (
  -- Dyrektor widzi wszystko
  EXISTS (SELECT 1 FROM directors WHERE user_id = auth.uid() AND tenant_id = consultations.tenant_id)
  OR
  -- Przedstawiciel widzi tylko swoje
  (director_id = (SELECT d.id FROM directors d 
                  JOIN sales_representatives sr ON sr.parent_director_id = d.id 
                  WHERE sr.user_id = auth.uid()))
);
```

### E. Workflow przekazywania kontaktu

```text
DYREKTOR                          PRZEDSTAWICIEL
    |                                    |
    | 1. Przekazuje kontakt              |
    |─────────────────────────────────────>
    |    (tworzy task + deadline 14 dni) |
    |                                    |
    |                              2. Umawia spotkanie
    |                                    |
    | 3. Monitoring (follow-up task)     |
    |<─────────────────────────────────────
    |                                    |
    | 4a. Jeśli nie umówił:              |
    |     - Przedłuż deadline            |
    |     - LUB Odbieram kontakt         |
    |                                    |
    | 4b. Jeśli umówił:                  |
    |     - Status: "W trakcie"          |
    |     - Nowy task: "Spotkanie"       |
    |                                    |
    | 5. Po spotkaniu:                   |
    |     - Nowy task: "Follow-up"       |
    |     - Notatki ze spotkania         |
    |                                    |
    | 6. Zamknięcie:                     |
    |     - "Podjęcie współpracy"        |
    |     - LUB "Odrzucone"              |
```

### F. Nowe komponenty

| Plik | Opis |
|------|------|
| `src/pages/Representatives.tsx` | Panel zarządzania przedstawicielami |
| `src/components/representatives/RepresentativesList.tsx` | Lista przedstawicieli |
| `src/components/representatives/AddRepresentativeModal.tsx` | Dodawanie przedstawiciela |
| `src/components/representatives/AssignContactModal.tsx` | Przekazywanie kontaktu |
| `src/components/representatives/RepContactsTable.tsx` | Tabela przekazanych kontaktów |
| `src/hooks/useRepresentatives.ts` | Hook CRUD |
| `src/hooks/useRepresentativeContacts.ts` | Hook dla przypisań |

### G. Widok przedstawiciela

Przedstawiciel logując się widzi:
- Uproszczony dashboard
- Lista przypisanych kontaktów
- Własne zadania
- Brak dostępu do: Sieci, Analityki, Spotkań grupowych, Dopasowań AI

---

## Część 4: Podsumowanie plików

### Nowe pliki
| Plik | Opis |
|------|------|
| `src/components/settings/GroupRefreshPolicyEditor.tsx` | Edytor polityki odświeżania |
| `src/pages/Representatives.tsx` | Strona zarządzania |
| `src/components/representatives/*.tsx` | 5 komponentów |
| `src/hooks/useRepresentatives.ts` | Hook CRUD |
| `src/hooks/useRepresentativeContacts.ts` | Hook przypisań |

### Modyfikowane pliki
| Plik | Zmiany |
|------|--------|
| `src/pages/Dashboard.tsx` | Nowy układ widgetów |
| `src/components/dashboard/AnalyticsOverview.tsx` | Zmiana tytułu |
| `src/components/dashboard/ContactsToRenew.tsx` | Logika polityki grupy |
| `src/hooks/useAnalytics.ts` | Network health z polityką |
| `src/hooks/useRelationshipHealth.ts` | Alerty z polityką |
| `src/pages/Settings.tsx` | Nowa zakładka "Polityka relacji" |
| `src/App.tsx` | Nowa ścieżka /representatives |
| `src/components/layout/AppSidebar.tsx` | Link do przedstawicieli |

### Migracje SQL
1. Rozszerzenie `contact_groups` o politykę odświeżania
2. Nowa tabela `sales_representatives`
3. Nowa tabela `representative_contacts`
4. RLS policies dla ograniczonego dostępu

---

## Kolejność implementacji

1. **Faza 1**: Reorganizacja Dashboard (layout + zmiana nazwy)
2. **Faza 2**: Polityka odświeżania dla grup (SQL + UI admina)
3. **Faza 3**: Aktualizacja logiki Network Health
4. **Faza 4**: Tabele dla przedstawicieli (SQL + RLS)
5. **Faza 5**: Hook i komponenty przedstawicieli
6. **Faza 6**: Workflow przekazywania kontaktu
7. **Faza 7**: Widok uproszczony dla przedstawiciela
