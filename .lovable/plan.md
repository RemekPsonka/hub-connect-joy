

# N-apply plan-v2 — Aplikacja decyzji do `deal_team_contacts`

## Korekty względem plan-v1 (per review)

1. **Q-D ✅** — Dodaj `k1_meeting_done_at = COALESCE(k1_meeting_done_at, NEW.meeting_date::timestamptz)` do branch `'go'` i `'postponed'`.
2. **Q-E ✏️ KOREKTA** — USUŃ `next_action = COALESCE(next_action, '...')` z `'go'` i `'postponed'`. Dla `'dead'` zostaje `next_action = NULL`.
3. **Q-F ✅ NIE** — temperature out of scope (sprint T1).

## Pre-flight checks PRZED execute (3 sprawdzenia, blokujące)

### Sprawdzenie #1 — CHECK constraints na `deal_stage` / `category`
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.deal_team_contacts'::regclass
  AND contype = 'c'
  AND (conname ILIKE '%deal_stage%' OR conname ILIKE '%category%');
```
**Decyzja:** jeśli któryś CHECK NIE zawiera `'lost'` w whitelist → STOP, flag, czekam na korektę. Jeśli clean → execute.

### Sprawdzenie #2 — `status` allowed values
```sql
SELECT DISTINCT status FROM public.deal_team_contacts;
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.deal_team_contacts'::regclass
  AND contype = 'c'
  AND conname ILIKE '%status%';
```
**Decyzja:** jeśli `'lost'`/`'closed'` dozwolone → dorzuć `status='lost'` (preferowane) lub `status='closed'` do branch `'dead'`. Jeśli tylko `'active'` w użyciu i brak CHECK → zostaw `status` nietknięte, follow-up B-FIX.

### Sprawdzenie #3 — `log_deal_category_change` body
```sql
SELECT pg_get_functiondef('public.log_deal_category_change'::regproc);
```
**Cel:** weryfikacja czy funkcja nie odwołuje się do `auth.uid()` w sposób, który w SECURITY DEFINER trigger zwraca NULL i łamie INSERT do `deal_team_activity_log`. Jeśli używa `auth.uid()` → flaguj, ewentualnie użyj `NEW.created_by` z meeting_decisions zamiast.

## Migracja: `supabase/migrations/20260422120000_apply_meeting_decision.sql`

```sql
-- =====================================================================
-- N-apply: Trigger AFTER INSERT ON meeting_decisions
--          → UPDATE deal_team_contacts (apply decision)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.apply_meeting_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.decision_type = 'go' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date   = NEW.next_action_date,
           k1_meeting_done_at = COALESCE(k1_meeting_done_at, NEW.meeting_date::timestamptz),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'postponed' THEN
    UPDATE public.deal_team_contacts
       SET next_action_date   = NEW.postponed_until,
           k1_meeting_done_at = COALESCE(k1_meeting_done_at, NEW.meeting_date::timestamptz),
           last_status_update = now()
     WHERE id = NEW.deal_team_contact_id;

  ELSIF NEW.decision_type = 'dead' THEN
    UPDATE public.deal_team_contacts
       SET is_lost            = true,
           lost_reason         = NEW.dead_reason,
           lost_at             = now(),
           category            = 'lost',
           deal_stage          = 'lost',
           next_action_date    = NULL,
           next_action         = NULL,
           last_status_update  = now()
     WHERE id = NEW.deal_team_contact_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_meeting_decision
AFTER INSERT ON public.meeting_decisions
FOR EACH ROW
EXECUTE FUNCTION public.apply_meeting_decision();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_apply_meeting_decision ON public.meeting_decisions;
-- DROP FUNCTION IF EXISTS public.apply_meeting_decision();
```

**Note:** jeśli sprawdzenie #2 pokaże dozwolony `status='lost'` lub `'closed'`, dorzucę odpowiednio do branch `'dead'`. Inaczej zostawiam jak wyżej.

## Pliki do dotknięcia

| Plik | Estimate | Zakres |
|---|---|---|
| `supabase/migrations/20260422120000_apply_meeting_decision.sql` (NOWY) | ~50 linii | function + trigger + ROLLBACK comment |

**ZERO zmian w FE.** `useCreateMeetingDecision.onSuccess` już invaliduje `['deal-team-contacts', teamId]`.

## Post-execute pre-flight

### #1 — trigger zarejestrowany
```sql
SELECT count(*) FROM pg_trigger
WHERE tgname = 'trg_apply_meeting_decision' AND NOT tgisinternal;
-- expected: 1
```

### #2 — test 'go' (BEGIN/ROLLBACK)
```sql
BEGIN;
  WITH c AS (SELECT id, team_id, tenant_id FROM deal_team_contacts LIMIT 1)
  INSERT INTO meeting_decisions (tenant_id, team_id, deal_team_contact_id,
                                  decision_type, meeting_date, next_action_date, created_by)
  SELECT tenant_id, team_id, id, 'go', CURRENT_DATE, CURRENT_DATE + 7,
         (SELECT id FROM auth.users LIMIT 1)
  FROM c;
  SELECT id, next_action_date, k1_meeting_done_at, last_status_update
    FROM deal_team_contacts
   WHERE id = (SELECT id FROM deal_team_contacts LIMIT 1);
ROLLBACK;
```
**Verify:** `next_action_date = CURRENT_DATE + 7`, `k1_meeting_done_at` set jeśli było NULL, `last_status_update ≈ now()`.

### #3 — test 'dead' (BEGIN/ROLLBACK + audit log check)
```sql
BEGIN;
  WITH c AS (SELECT id, team_id, tenant_id FROM deal_team_contacts LIMIT 1)
  INSERT INTO meeting_decisions (tenant_id, team_id, deal_team_contact_id,
                                  decision_type, meeting_date, dead_reason, created_by)
  SELECT tenant_id, team_id, id, 'dead', CURRENT_DATE, 'Test reason',
         (SELECT id FROM auth.users LIMIT 1)
  FROM c;
  SELECT id, is_lost, lost_reason, lost_at, category, deal_stage,
         next_action_date, next_action
    FROM deal_team_contacts
   WHERE id = (SELECT id FROM deal_team_contacts LIMIT 1);
  SELECT count(*) FROM deal_team_activity_log
   WHERE contact_id = (SELECT id FROM deal_team_contacts LIMIT 1)
     AND action = 'category_changed'
     AND created_at > now() - interval '1 minute';
ROLLBACK;
```
**Verify:** `is_lost=true`, `lost_reason='Test reason'`, `category='lost'`, `deal_stage='lost'`, `next_action_date=NULL`, audit log row count ≥ 1.

## STOP conditions

- Sprawdzenia #1, #2, #3 wykonane PRZED execute migracji
- Jeśli któreś sprawdzenie pokazuje problem (CHECK whitelist bez 'lost', `auth.uid()` w log function) → STOP, flag, czekam na korektę
- Migration name: `20260422120000_apply_meeting_decision.sql`
- `SECURITY DEFINER` + `SET search_path = public`
- `AFTER INSERT` (atomowość z rollbackiem)
- ROLLBACK comment w pliku
- ZERO zmian w FE
- Post-execute pre-flight #1 + #2 + #3 wszystkie clean
- Supabase linter — 0 nowych warnings

## Raport po execute

1. Output sprawdzenia #1 (CHECK constraints na deal_stage/category)
2. Output sprawdzenia #2 (status DISTINCT + CHECK)
3. Output sprawdzenia #3 (log_deal_category_change body — flag jeśli auth.uid())
4. Decyzja: czy `status='...'` dorzucone do 'dead' branch, jakie SQL final
5. Migration file path + line count
6. Pre-flight #1: trigger count = 1 ✅/❌
7. Pre-flight #2: test 'go' — wszystkie pola zaktualizowane per spec
8. Pre-flight #3: test 'dead' — wszystkie pola + audit log entry zarejestrowany
9. Confirm: zero zmian w FE (grep `useMeetingDecisions`, `MeetingDecisionDialog` netknięte)
10. Supabase linter output (0 nowych warnings)

## Backlog (osobne sprinty)

- **M2** — Milestone progression K2→K3→K4 (offering_stage advance)
- **T1** — Temperature bump logic
- **N1** — Notifications/eventy po decyzji (Sovra context update)
- **B-FIX** — `status` field handling jeśli sprawdzenie #2 ujawni gap
- **B1** — Backfill historycznych meeting_decisions (jeśli okaże się potrzebne)

