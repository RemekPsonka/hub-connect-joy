# Część A — Recon report (read-only): root cause „Odłóż" zlokalizowany

Data: 2026-04-21. Źródło: live DB query (Supabase).

## 🔴 ROOT CAUSE — POTWIERDZONY

**Tabela `public.deal_team_activity_log` NIE ISTNIEJE w bazie**, a trigger `log_deal_category_change` na `deal_team_contacts` próbuje do niej `INSERT` przy każdej zmianie `category`. Każdy UPDATE zmieniający kategorię (np. `'audit' → '10x'` przy snooze) **rolluje się** z błędem `relation "public.deal_team_activity_log" does not exist`.

To wyjaśnia 100% objawów:
- Bogdan Pietrzak: `category=audit, snoozed_until=NULL, updated_at=2026-04-20 18:11:09` (sprzed dnia kliku „Odłóż").
- Każdy klik „Odłóż" → mutacja → Postgres rzuca błąd → React Query `onError` → toast „Błąd aktualizacji…".
- Wszystkie inne UPDATE na `deal_team_contacts` które NIE zmieniają `category` (np. „Wyślij ofertę" gdy contact już ma `category='offering'`, „Zadzwoń" bez update, „Spotkanie umówione" gdy kategoria bez zmian) — przechodzą OK.

## 1. Trigger `log_deal_category_change`

```sql
CREATE OR REPLACE FUNCTION public.log_deal_category_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.category IS DISTINCT FROM NEW.category THEN
    INSERT INTO public.deal_team_activity_log
      (team_id, tenant_id, team_contact_id, actor_id, action, old_value, new_value)
    VALUES
      (NEW.team_id, NEW.tenant_id, NEW.id,
       get_current_director_id(), 'category_changed',
       jsonb_build_object('category', OLD.category),
       jsonb_build_object('category', NEW.category));
    NEW.category_changed_at = now();
  END IF;
  RETURN NEW;
END;
$function$
```

**Tabela docelowa:**
```sql
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='deal_team_activity_log';
-- → 0 wierszy. Tabela nie istnieje.
```

`get_current_director_id()` jest poprawna i dla Remka zwraca `98a271e8-d923-49cb-a6aa-45f3ac0064d8`:
```sql
SELECT id FROM public.directors WHERE user_id = auth.uid() LIMIT 1
```
Remek istnieje: `Remigiusz Psonka` / `remek@ideecom.pl` / director_id `98a271e8-...`.

→ Problem **NIE** jest w `actor_id NULL`. Problem to brakująca tabela.

## 2. CHECK na `deal_team_contacts.offering_stage`

```sql
CHECK (offering_stage IS NULL OR offering_stage = ANY (ARRAY[
  'decision_meeting','handshake','power_of_attorney','audit',
  'offer_sent','negotiation','won','lost'
]))
```

**Diff TS vs DB vs hook:**

| Wartość | TS `OfferingStage` | DB CHECK | Hook `defaultSubStages` |
|---|---|---|---|
| `decision_meeting` | ✅ | ✅ | — |
| `handshake` | ✅ | ✅ | offering→ |
| `power_of_attorney` | ✅ | ✅ | — |
| `audit` | ✅ | ✅ | — |
| `offer_sent` | ✅ | ✅ | — |
| `negotiation` | ✅ | ✅ | — |
| `won` | ✅ | ✅ | — |
| `lost` | ✅ | ✅ | — |
| `preparation`, `accepted` | ✅ legacy | ❌ | — |
| `audit_plan` | ✅ legacy | ❌ | **audit→** ⚠️ |
| `audit_scheduled`, `audit_done` | ✅ legacy | ❌ | — |
| `meeting_plan` | ✅ legacy | ❌ | **hot→, top→** ⚠️ |
| `meeting_scheduled`, `meeting_done` | ✅ legacy | ❌ | — |

**Bomby zegarowe** (`useDealsTeamContacts.ts:296-304`):
- `category:'audit'` bez jawnego `offeringStage` → hook ustawia `'audit_plan'` → CHECK violation → UPDATE rollback.
- `category:'hot'` lub `'top'` → hook ustawia `'meeting_plan'` → CHECK violation → UPDATE rollback.
- `category:'10x'` → brak w `defaultSubStages` → `offering_stage` zostaje (`handshake`) → OK ze strony CHECK, ale i tak rolluje się przez brakującą tabelę z punktu 1.

## 3. Stan rekordu Bogdana

```sql
SELECT dtc.id, c.full_name, dtc.category, dtc.offering_stage, dtc.snoozed_until,
       dtc.snooze_reason, dtc.snoozed_from_category, dtc.updated_at, dtc.category_changed_at
FROM deal_team_contacts dtc JOIN contacts c ON c.id=dtc.contact_id
WHERE c.full_name ILIKE '%Bogdan%Pietrzak%';
```
| pole | wartość |
|---|---|
| id | `ff95fb46-90a4-4097-a964-14dd7fdd193b` |
| category | `audit` |
| offering_stage | `handshake` |
| snoozed_until | **NULL** |
| snooze_reason | NULL |
| snoozed_from_category | NULL |
| updated_at | 2026-04-20 18:11:09 (wczoraj) |
| category_changed_at | 2026-02-14 09:26:38 |

→ Ani jeden klik „Odłóż" z 2026-04-21 nie dotarł do bazy.

## DoD Część A

| Check | Stan |
|---|---|
| Pełna definicja `log_deal_category_change` | ✅ |
| Lista kolumn `deal_team_activity_log` | ✅ tabela nie istnieje (0 wierszy) |
| Definicja `get_current_director_id()` + sprawdzenie dla Remka | ✅ zwraca director_id, NIE NULL |
| Pełny CHECK na `offering_stage` z listą wartości | ✅ 8 wartości, brak `*_plan/scheduled/done`, `preparation`, `accepted` |
| Diff TS vs hook vs DB | ✅ tabela powyżej |
| Stan rekordu Bogdana | ✅ snoozed_until NULL, updated_at sprzed kliku |
| Zero edycji kodu/DB | ✅ |

## Część B (do osobnego sprintu — propozycja po wynikach A)

**B.1 (priorytet 0 — odblokowuje „Odłóż" i każdą zmianę kategorii):**
Migracja tworząca tabelę `public.deal_team_activity_log` z kolumnami z INSERT triggera (`team_id, tenant_id, team_contact_id, actor_id, action, old_value, new_value, created_at`), `actor_id` **nullable** (bo `get_current_director_id()` ze service_role/cron może być NULL), RLS read-only dla członków zespołu, FK na `deal_teams/tenants/deal_team_contacts` z `ON DELETE CASCADE`. Z rollbackiem (DROP TABLE).

**B.2 (priorytet 1 — usuwa bomby zegarowe na `audit/hot/top`):**
Edytować `useDealsTeamContacts.ts:296-304` — usunąć `audit:'audit_plan'`, `hot:'meeting_plan'`, `top:'meeting_plan'` z `defaultSubStages`. Zostawić tylko `offering:'handshake'` (jedyne legalne). UI dialogi które chcą ustawić `audit` powinny same przekazać legalne `offeringStage` (`'audit'` z nowej listy 8, nie legacy `audit_plan`).

**B.3 (opcjonalnie, niski priorytet):**
Wyczyścić legacy z `OfferingStage` w `src/types/dealTeam.ts` (linie 42-50) po sweep'ie kodu. Osobny ADR.

