

# Wybór lejka i etapu w „Przekaż do SGU"

## Cel
Przycisk „Przekaż do SGU" (na karcie kontaktu) ma pytać: **do którego lejka** i **na który etap** trafia kontakt. Dziś hardkoduje SGU + `lead`, przez co nie da się wrzucić kontaktu np. do lejka `Paweł&Remek` ani od razu na `prospect`/`offering`.

## Zakres zmian

### 1. UI — `PushToSGUDialog.tsx`

Dodaję dwa selecty na początku formularza:

- **Lejek** (`team_id`) — `Select` z listą `deal_teams` dostępnych dla zalogowanego dyrektora (hook `useDealsTeams` lub query do `deal_teams` z filtrem RLS). Domyślnie SGU (zgodność wsteczna). Jeśli jest tylko 1 lejek — select ukryty, wartość ustawiona automatycznie.
- **Etap startowy** (`stage`) — `Select` z 4 opcjami: `Prospekt` / `Lead` / `Ofertowanie` / `Klient`. Domyślnie `Lead`.

Pole „Oczekiwany przypis" pokazuje się tylko dla `lead`/`offering`/`client` (przy `prospect` zwykle nieznany — opcjonalnie).

Tytuł dialogu zmieniam na **„Przekaż do lejka"** (bez sztywnej nazwy SGU). Subskrypt: „Wybierz lejek i etap startowy".

Po sukcesie nawigacja idzie do właściwego lejka:
- SGU → `/sgu/sprzedaz?highlight=<id>`
- inny → `/deals-team?team=<team_id>&view=sales&highlight=<id>`

### 2. Edge function — `sgu-push-contact`

Rozszerzam `PushBody` o:
- `team_id?: string` — opcjonalne, fallback do `get_sgu_team_id()` (BC).
- `stage?: 'prospect' | 'lead' | 'offering' | 'client'` — opcjonalne, fallback `'lead'`.

Walidacje:
- Jeśli `team_id` podany → sprawdzam `is_deal_team_member(user, team_id)` przez RPC, żeby dyrektor nie wrzucał do cudzych lejków.
- `stage` musi być w whitelist 4 wartości.

Zmiana w INSERT:
- `team_id` z body (lub fallback SGU).
- `category` = mapowanie ze `stage`:
  - `prospect` → `category: 'prospect'`
  - `lead` → `category: 'lead'`
  - `offering` → `category: 'offering'`
  - `client` → `category: 'client'` + `status: 'won'` zamiast `'new'`
- `prospect_source: 'crm_push'` (zawsze, niezależnie od etapu — bo to przekazanie z CRM).

Idempotencja zostaje per `(team_id, source_contact_id)` — czyli ten sam kontakt można wrzucić do **różnych** lejków, ale do tego samego raz.

Komunikat zwrotny zawiera `team_id` i `stage`, żeby frontend mógł zbudować właściwy link.

### 3. Hook — nowy `useAvailableDealTeams.ts`

```ts
// query do deal_teams gdzie is_active=true, RLS filtruje do dostępnych dla usera
```

Używany w `PushToSGUDialog` do wypełnienia selecta. Cache `staleTime: 5 min`.

### 4. Drobne — przycisk wywołujący

Plik z przyciskiem „Przekaż do SGU" na karcie kontaktu (komponent w okolicy `ContactDetail`) — zmieniam etykietę przycisku na **„Przekaż do lejka"**. Warunek widoczności: dyrektor + `useAvailableDealTeams.length > 0` (zamiast warunku na SGU). SGU-only flag z `useSGUTeamId().enabled` przestaje gatekeepować — przycisk działa też gdy jest tylko `Paweł&Remek`.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/hooks/useAvailableDealTeams.ts` | NEW |
| 2 | `src/components/sgu/PushToSGUDialog.tsx` | EDIT — 2 selecty, mapowanie, nawigacja |
| 3 | `supabase/functions/sgu-push-contact/index.ts` | EDIT — body schema + walidacja + mapowanie stage→category |
| 4 | komponent z przyciskiem (do zlokalizowania w `src/components/contacts/...`) | EDIT — etykieta + warunek widoczności |

Bez migracji DB — schemat wystarcza (`category` enum już ma wszystkie wartości, `prospect_source` zostaje `crm_push`).

## Poza zakresem
- Wybór konkretnej sub-kategorii (temperature/offering_stage/client_status) w dialogu — domyślnie `NULL`, ustawiane potem na kanbanie.
- Bulk push (wiele kontaktów naraz).
- Nowa nazwa pliku komponentu (`PushToSGUDialog` zostaje, choć działa już dla wszystkich lejków — rename w osobnym PR).

## DoD

| Check | Stan |
|---|---|
| Dialog pokazuje select lejków (lub auto-ustawia gdy 1 lejek) | ⬜ |
| Dialog pokazuje select etapu (4 opcje, domyślnie Lead) | ⬜ |
| Edge function akceptuje `team_id` + `stage`, waliduje członkostwo | ⬜ |
| Mapowanie stage→category działa (prospect/lead/offering/client) | ⬜ |
| Idempotencja per `(team_id, source_contact_id)` — ten sam kontakt do 2 lejków OK | ⬜ |
| Po pushu do `Paweł&Remek` nawigacja do `/deals-team?team=...&highlight=...` | ⬜ |
| Po pushu do SGU nawigacja do `/sgu/sprzedaz?highlight=...` (BC) | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

