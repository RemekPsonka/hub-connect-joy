# Fix: zaległe zadania po konwersji na klienta

## Problem
Robert Karczewski został przekonwertowany na klienta (`category='client'`, `offering_stage='won'`, `won_at=2026-04-25`), ale w widoku `/sgu/zadania` nadal wiszą 2 zadania jako zaległe:

- "Wyślij ofertę mailem" (due 2026-04-26, status `todo`)
- "Spotkanie — podpisanie polisy" (due 2026-04-30, status `todo`)

## Przyczyna
RPC `convert_to_client(p_dtc_id, p_areas)` ustawia tylko pola na `deal_team_contacts` (category, won_at, offering_stage, potencjały). **Nie zamyka otwartych zadań** powiązanych z tym deal_team_contact. Hook `useConvertToClient` też nic z taskami nie robi.

W efekcie po konwersji wszystkie nieukończone taski tego kontaktu pozostają z `status='todo'` i — jeśli minęła data — pokazują się w filtrze "Zaległe".

## Naprawa

### 1. Migracja — rozszerz `convert_to_client`
Po `UPDATE deal_team_contacts` dodać:

```sql
UPDATE public.tasks
SET status = 'completed',
    updated_at = now()
WHERE deal_team_contact_id = p_dtc_id
  AND status IN ('todo', 'in_progress');
```

To gwarantuje atomowość: konwersja na klienta = lejek zamknięty = brak otwartych tasków lejkowych.

### 2. Backfill — domknięcie historycznych przypadków
W tej samej migracji jednorazowo:

```sql
UPDATE public.tasks t
SET status = 'completed', updated_at = now()
FROM public.deal_team_contacts dtc
WHERE t.deal_team_contact_id = dtc.id
  AND dtc.category = 'client'
  AND t.status IN ('todo', 'in_progress');
```

Posprząta Roberta i wszystkich innych klientów, którzy mogli mieć ten sam problem.

### 3. Invalidacje React Query
W `useConvertToClient.onSuccess` dodać `qc.invalidateQueries({ queryKey: ['sgu-tasks'] })` żeby lista "Zaległe" odświeżyła się od razu po konwersji bez F5.

## Co NIE wchodzi w zakres
- Nie ruszamy filtra "Zaległe" w `useSGUTasks` — root cause jest w RPC.
- Nie zmieniamy logiki `useSguStageTransition` (tranzycje etapów lejka działają poprawnie).
- Nie tworzymy żadnych nowych tabel ani triggerów.

## Test akceptacyjny
1. Wejść na `/sgu/zadania?member=all` z filtrem "Zaległe" → 2 taski Roberta znikają.
2. Skonwertować nowego prospekta na klienta z otwartymi taskami → wszystkie jego otwarte taski lejkowe automatycznie `completed`, nie pojawiają się w "Zaległe".
