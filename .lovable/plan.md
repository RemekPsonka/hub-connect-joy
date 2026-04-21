

# Część A — Recon read-only (bez edycji): trigger `log_deal_category_change`, CHECK na `offering_stage`, fallback `actor_id`

## Cel

Zebrać twarde dowody z bazy, żeby móc zaplanować Część B (fix migracja). Zero zmian w kodzie ani DB. Wyniki spiszemy w `.lovable/plan.md` jako recon-report.

## Co sprawdzimy (3 obszary)

### 1. Trigger `log_deal_category_change` + tabela activity log

Sprawdzić w Supabase:

```sql
-- definicja funkcji triggera
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'log_deal_category_change';

-- kolumny i NOT NULL w activity log
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deal_team_activity_log'
ORDER BY ordinal_position;

-- definicja get_current_director_id()
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p WHERE p.proname = 'get_current_director_id';
```

Cel: potwierdzić czy `actor_id` jest `NOT NULL` i czy `get_current_director_id()` może zwrócić NULL → wtedy trigger blokuje cały UPDATE.

### 2. CHECK constraint na `deal_team_contacts.offering_stage`

```sql
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'deal_team_contacts' AND c.contype = 'c';
```

Cel: pełna lista dozwolonych wartości. Porównać z `OfferingStage` w `src/types/dealTeam.ts` i z `defaultSubStages` w `src/hooks/useDealsTeamContacts.ts:296–304`. Wytypować brakujące (`audit_plan`, `audit_scheduled`, `meeting_plan`, `meeting_scheduled`).

### 3. Stan rekordu Bogdana + Postgres logs z ostatnich 24h

```sql
-- stan rekordu
SELECT id, name, category, offering_stage, snoozed_until, snooze_reason,
       snoozed_from_category, updated_at
FROM deal_team_contacts
WHERE name ILIKE '%Bogdan%Pietrzak%';

-- czy Remek ma director?
SELECT d.id, d.full_name, d.user_id
FROM directors d
WHERE d.user_id IN (SELECT id FROM auth.users WHERE email ILIKE '%remek%');
```

I logi z `analytics_query` (postgres_logs) z grepem po `deal_team_contacts` / `actor_id` / `offering_stage` / `violates` z ostatnich 24h.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `.lovable/plan.md` | EDIT — zastąpić aktualny plan recon-reportem (3 sekcje: trigger, CHECK, stan Bogdana + logs) |

## DoD Część A

| Check | Stan |
|---|---|
| Pełna definicja `log_deal_category_change` zacytowana w raporcie | ⬜ |
| Lista kolumn `deal_team_activity_log` z `is_nullable` | ⬜ |
| Definicja `get_current_director_id()` + odpowiedź czy zwraca NULL dla Remka | ⬜ |
| Pełny CHECK constraint na `offering_stage` z listą wartości | ⬜ |
| Diff: `OfferingStage` (TS) vs `defaultSubStages` (hook) vs CHECK (DB) | ⬜ |
| Stan rekordu Bogdana po próbie snooze + ewentualne błędy z postgres_logs | ⬜ |
| Zero edycji kodu/DB | ✅ |

## Część B (zarys, do oddzielnego sprintu po wynikach A)

Trzy gałęzie zależne od wyników:

- **B.1 (jeśli `actor_id NOT NULL` + NULL z `get_current_director_id`):** migracja patchująca `log_deal_category_change` — `IF NEW.actor_id IS NULL THEN RETURN NEW;` lub `COALESCE(get_current_director_id(), (SELECT id FROM directors WHERE tenant_id = NEW.tenant_id LIMIT 1))`. Z rollbackiem.
- **B.2 (jeśli CHECK nie zawiera `audit_plan/audit_scheduled/meeting_plan/meeting_scheduled`):** migracja `DROP CONSTRAINT ... ADD CONSTRAINT ...` z pełną listą wyciągniętą z `OfferingStage` w `types/dealTeam.ts`. Z rollbackiem.
- **B.3 spójność hooka:** edytować `useDealsTeamContacts.ts:296–304` — albo usunąć `audit:'audit_plan'` z `defaultSubStages`, albo zmienić na `audit_scheduled` (decyzja po review screenu „Audyt").

Część B osobnym planem po zatwierdzeniu wyników recon.

