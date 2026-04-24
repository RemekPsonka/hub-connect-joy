# Plan: Klienci utraceni w Raportach + przywracanie do lejka

## Cel
W `/sgu/reports` dodać kartę **"Klienci utraceni"** — listę kontaktów z `deal_team_contacts.is_lost = true` z akcją **"Przywróć do lejka"**, gdzie użytkownik wybiera docelowy etap (kategorię) i kontakt wraca do aktywnego flow.

## Pre-flight (zweryfikowane)
- Pole utraty: `deal_team_contacts.is_lost` (bool), `lost_reason` (text), `lost_at` (timestamp), `status='lost'`, dla offering `offering_stage='lost'`. Mechanizm zapisu istnieje w `LostReasonDialog.tsx`.
- Stage = pole `category` (`DealCategory`), wyższy poziom `stage` (`DealStage`) jest GENERATED z `category`.
- Strona Raportów: `src/pages/sgu/SGUReports.tsx` — ma już `FunnelKpiCard` i `StalledContactsCard`. Nowa karta wleci obok.
- Hooki: `useDealsTeamContacts.ts` ma już mutację z polami `is_lost / lost_reason / lost_at` (pattern do reuse / odwrócenia).
- ContactTasksSheet — nie potrzebny tutaj (to inny flow), tu tylko lista + akcja.

## Co zbudować

### 1. Hook: `src/hooks/useLostClients.ts`
- `useLostClients(teamId)` — React Query, `queryKey: ['lost-clients', teamId]`.
- Query: `deal_team_contacts` filtr `team_id = teamId`, `is_lost = true`, join `contacts(full_name, company)`, sort `lost_at desc`, limit 200.
- Zwraca: `id` (PK dtc), `contact_id`, `contact_name`, `company`, `lost_reason`, `lost_at`, `category` (poprzednia), `offering_stage`.
- `useRestoreFromLost()` — mutacja: update `deal_team_contacts` po `id`:
  - `is_lost=false`, `lost_reason=null`, `lost_at=null`, `status='active'`, `category=<wybrana>`, jeśli stage offering nie pasuje → `offering_stage=null`, `last_status_update=now()`.
  - invalidate: `['lost-clients']`, `['deal-team-contacts', teamId]`, `['unified-kanban-data']`, `['sgu-funnel']`.

### 2. Komponent: `src/components/sgu/reports/LostClientsCard.tsx`
- `Card` z nagłówkiem "Klienci utraceni" + licznik.
- `Table`: Imię i firma | Powód utraty (truncate) | Data utraty (DD.MM.YYYY) | Akcje.
- Akcja: przycisk "Przywróć" otwiera `RestoreToFunnelDialog`.
- Skeleton + empty state ("Brak utraconych klientów.").
- Paginacja: pokazujemy first 50, link "Pokaż wszystkie" → expand (proste, bez serwerowej paginacji).

### 3. Komponent: `src/components/sgu/reports/RestoreToFunnelDialog.tsx`
- `Dialog` z `Select` (etap docelowy):
  - opcje z `STAGE_LABELS` zawężone do aktywnych: `prospect`, `lead`, `offering`, `client` (bez `lost`).
  - Dla wybranego stage podpowiadamy `category` mapping: prospect→`cold`, lead→`hot` (default), offering→`offering`, client→`client`. Drugi `Select` z konkretną kategorią (DealCategory) pre-fillem.
- Tekstowo: "Kontakt wróci do lejka. Powód utraty zostanie wyczyszczony, ale historia zachowana w `audit_log`."
- Confirm → `useRestoreFromLost` → toast + close.

### 4. Integracja: `src/pages/sgu/SGUReports.tsx`
- Pod `<StalledContactsCard />` dorzucić `<LostClientsCard />` opakowane w `useSGUTeamId()` (wzór jak w innych kartach SGU).

## Zmienione/nowe pliki
- `src/hooks/useLostClients.ts` (NEW)
- `src/components/sgu/reports/LostClientsCard.tsx` (NEW)
- `src/components/sgu/reports/RestoreToFunnelDialog.tsx` (NEW)
- `src/pages/sgu/SGUReports.tsx` (1-liniowy import + render)

## Bez zmian
- Brak migracji DB (wszystkie potrzebne pola istnieją).
- Brak zmian w RPC.
- Brak zmian w `LostReasonDialog` ani w kanbanie.

## Edge cases
- `lost_at IS NULL` (legacy) — pokazujemy "—" w kolumnie daty, sort z NULL na końcu.
- RLS: `deal_team_contacts` ma już RLS per team — list query po `team_id` jest bezpieczny.
- Brak `teamId` → karta nie renderuje się.

Czekam na GO/NO GO.