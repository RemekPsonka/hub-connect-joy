## Pre-flight wyniki

**A. Użycia `park`/`pivot` w src/:**
- `src/components/sgu/odprawa/OdprawaExceptionsBar.tsx` — wysyła `decision: 'park'` (przycisk "Odłóż")
- `src/hooks/useLogDecision.ts` — typ `DecisionVerdict` zawiera `'park' | 'pivot'`, branch zapisujący `postponed_until` gdy `decision==='park'`
- `src/hooks/odprawa/useContactTimelineState.ts` — typ `DecisionKey` zawiera `'park' | 'pivot'`
- `src/hooks/odprawa/useAIProposalExecutor.ts` — AI może proponować `park`/`pivot` (OOS — nie ruszamy)

**B. Realny stan `OdprawaExceptionsBar` (sprzed refaktoru):**
- Komponent ma **2 przyciski**, nie 4: "Odłóż" (`park` + DatePicker default +7d) oraz "Utracony" (`kill` + inline AlertDialog z textarea na powód, NIE `LostReasonDialog`).
- Spec zakłada cięcie 4→2 — w rzeczywistości jest 2→2 z **podmianą semantyki**: `park`→`push` + zamiana inline kill-dialogu na zewnętrzny `LostReasonDialog`.

**C. `apply_meeting_decision` w DB:**
- Pisana w stylu `IF/ELSIF`, nie `CASE`. Obsługuje `go`, `postponed`, `dead`.
- **Brak gałęzi `push`**, **brak aliasu `kill`** (S3 z aliasem dead/kill nie został wdrożony — pre-flight obala założenie spec).
- `dead` już ustawia `is_lost=true`, `lost_reason`, `lost_at`, `category='lost'`, `status='disqualified'`.
- `LostReasonDialog` po stronie UI sam aktualizuje `deal_team_contacts` (pomija ścieżkę przez `meeting_decisions`) — zachowujemy.

**Decyzja spec vs rzeczywistość:** stosuję cel sprintu (2 przyciski: "Przesuń"=push + "Utracony"=kill→LostReasonDialog, aktywna gałąź `push` w triggerze) na realnym stanie kodu. Dostawiam też alias `kill` w triggerze zgodnie z wymaganiem ("zachowaj gałąź dead/kill z S3") — zrobi się to teraz, bo S3 faktycznie tego nie zrobił.

---

## Plan implementacji

### Krok 1 — Migracja DB

Plik: `supabase/migrations/<ts>_s2_mini_apply_meeting_decision_push.sql`

`CREATE OR REPLACE FUNCTION apply_meeting_decision()` — kopia 1:1 obecnego ciała + 2 zmiany:

1. Dodaj **alias `kill`** obok `dead` (`ELSIF NEW.decision_type IN ('dead','kill')`).
2. Dodaj **aktywną gałąź `push`**:
   - `next_action_date` = `COALESCE((NEW.decision_data->>'postponed_until')::date, (now() + interval '7 days')::date)`
   - `snoozed_until` = analogicznie jako `timestamptz`
   - `last_status_update = now()`
   - **NIE** zamykamy `follow_up_task_id` w `push` (zachowanie zgodne z istniejącym FIX #23 — push tworzy/przesuwa task, nie kończy go)
3. `park`/`pivot` — bez branchy (no-op, jak dziś — UI już nie wysyła; legacy AI proposal też przejdzie bez efektu, akceptowalne w S2-mini).

`SECURITY DEFINER SET search_path = public`. Komentarz `-- ROLLBACK:` z poprzednią wersją funkcji.

**Uwaga schematu:** `meeting_decisions` ma kolumnę `postponed_until` (już używana dla `postponed`). Spec mówi o `decision_data->>'postponed_until'`, ale w obecnym pipeline (`useLogDecision`) push będzie wysyłany z wartością w kolumnie `postponed_until`, nie w `decision_data`. **Ujednolicenie:** trigger preferuje `NEW.postponed_until`, fallback na `decision_data->>'postponed_until'`, fallback na `now()+7d`. To pokrywa oba kontrakty.

### Krok 2 — `src/hooks/useLogDecision.ts`

- Rozszerzyć branch zapisu `postponed_until`: zapisuj również gdy `decision==='push'` (nie tylko `park`):
  `postponed_until: (input.decision === 'park' || input.decision === 'push') ? input.postponedUntil ?? null : null`
- Typ `DecisionVerdict` zostaje bez zmian (nadal zawiera park/pivot — legacy + AI).

### Krok 3 — `src/components/sgu/odprawa/OdprawaExceptionsBar.tsx`

Refaktor jednego pliku, zachowując kolory/ikony/hover:

1. **Przycisk "Odłóż" → "Przesuń"**:
   - Zmień label na `Przesuń`
   - Zmień `decision: 'park'` na `decision: 'push'` w `submitPark` (przemianować na `submitPush`)
   - DatePicker: bez zmian (default +7d, label "Przesuń decyzję na")
   - Po sukcesie: `toast.success('Przesunięto')`
   - **Nie** zapisujemy już ręcznie `snoozed_until` w `deal_team_contacts` z UI — robi to trigger DB (usuwam ten `supabase.from(...).update(...)` z `submitPush`, żeby nie dublować)

2. **Przycisk "Utracony"**:
   - Usuń lokalny `AlertDialog` + state `killOpen`/`killReason` + funkcję `submitKill`.
   - Importuj `LostReasonDialog` z `@/components/sgu/sales/LostReasonDialog`.
   - Otwieranie LostReasonDialog na klik "Utracony" (state `lostOpen`).
   - Props: `contactId`, `contactName` (musi przyjść w props — sprawdzę, czy `state` ma; jeśli nie, dodam prop `contactName`), `teamId`, `onSuccess` → invalidate odprawa-agenda + log decyzji `kill` przez `useLogDecision` dla audit trailu.
   - Decyzja: log `kill` przez `useLogDecision` przed/po sukcesie LostReasonDialog (dla zachowania historii w `meeting_decisions`).

3. Pozostawić kolejność: Przesuń (outline) → Utracony (destructive). Bez animacji.

### Krok 4 — Weryfikacja

- `npm run lint`
- Smoke preview: kontakt → "Przesuń" +14d → DB sprawdzenie `next_action_date` i `snoozed_until` = today+14d, kontakt znika z dzisiejszej agendy.
- Smoke: "Utracony" → LostReasonDialog → powód → `is_lost=true`, `category='lost'`, `lost_reason` ustawione, wpis w `meeting_decisions` z `decision_type='kill'`.

---

## Hard constraints

- Tylko 1 nowy plik migracji + edycja 2 plików (`OdprawaExceptionsBar.tsx`, `useLogDecision.ts`).
- Bez zmian w `LostReasonDialog`.
- Bez ruszania `useAIProposalExecutor`, `useContactTimelineState`, enum `decision_type`.
- Bez animacji, bez refactoru poza wymienionym scope.
- Trigger nie pisze do `deal_stage` (GENERATED).

## Out of scope

- Czyszczenie typów `DecisionVerdict`/`DecisionKey` z `park`/`pivot` (zostają — legacy + AI proposal).
- Mapowanie AI park/pivot na push (osobny sprint).
- Pozostałe sprinty audytu.