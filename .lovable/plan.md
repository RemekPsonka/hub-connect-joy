

# B-FIX.5-snooze Część B — fix tabela activity_log + sweep legacy sub-stages

## Diagnoza (z Części A)

Tabela `public.deal_team_activity_log` nie istnieje. Trigger `log_deal_category_change` na `deal_team_contacts` próbuje do niej `INSERT` przy każdej zmianie `category` → cały UPDATE rolluje się z `relation does not exist`. Blokuje: Odłóż, Audyt, Wyślij ofertę, Klient, Utracony.

Drugi bug pasywny: `defaultSubStages` w `useUpdateTeamContact` ustawia `offering_stage` na wartości spoza CHECK constraint (`audit_plan`, `meeting_plan`). Po fixie B.1 wyjdzie na pierwszy klik „Audyt".

## Rozwiązanie — jeden PR, dwie zmiany

### B.1 (P0) — migracja: utwórz `deal_team_activity_log` + RLS

Nowa migracja `supabase/migrations/<timestamp>_create_deal_team_activity_log.sql`:

- Tabela z kolumnami zgodnymi z INSERT triggera: `id`, `team_id` (FK→`deal_teams` CASCADE), `tenant_id` (FK→`tenants` CASCADE), `team_contact_id` (FK→`deal_team_contacts` CASCADE), `actor_id` (FK→`directors` SET NULL, **nullable** — dla cron/service_role), `action`, `old_value jsonb`, `new_value jsonb`, `created_at`.
- 3 indeksy: `(team_contact_id, created_at DESC)`, `(team_id, created_at DESC)`, `(actor_id)`.
- `ENABLE ROW LEVEL SECURITY`.
- Policy `dtal_select` — SELECT dla `is_deal_team_member(team_id)`. Brak INSERT/UPDATE/DELETE policy (pisane wyłącznie z triggera SECURITY DEFINER).
- `COMMENT ON TABLE` z opisem kontraktu.
- `-- ROLLBACK:` `DROP TABLE public.deal_team_activity_log CASCADE;`

Trigger `log_deal_category_change` zostaje bez zmian — jest poprawny, brakowało tylko tabeli docelowej.

### B.2 (P1) — edycja `src/hooks/useDealsTeamContacts.ts`

W `useUpdateTeamContact` (~linia 296–304) — usunąć z `defaultSubStages` mapowania `audit:'audit_plan'`, `hot:'meeting_plan'`, `top:'meeting_plan'`. Zostawić tylko `offering:'handshake'` jako domyślny start, gdy `offeringStage` nie został przekazany jawnie:

```ts
if (category !== undefined) {
  updates.category = category;
  // CHECK na offering_stage dopuszcza tylko: decision_meeting, handshake,
  // power_of_attorney, audit, offer_sent, negotiation, won, lost.
  // Dla audit/hot/top wartość zostaje bez zmian — UI musi przekazać offeringStage jawnie.
  if (category === 'offering' && offeringStage === undefined) {
    updates.offering_stage = 'handshake';
  }
}
```

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `supabase/migrations/<timestamp>_create_deal_team_activity_log.sql` | NEW — tabela + 3 indeksy + RLS + 1 policy SELECT + komentarz + ROLLBACK |
| 2 | `src/hooks/useDealsTeamContacts.ts` | EDIT — uprościć `defaultSubStages` w `useUpdateTeamContact` (~linia 296–304) |

## Poza zakresem (świadomie)

- **B.3** — sweep legacy w `OfferingStage` (`src/types/dealTeam.ts`: `audit_plan/audit_scheduled/audit_done/meeting_plan/meeting_scheduled/meeting_done/preparation/accepted`) — osobny sprint porządkowy.
- Edge function `return-snoozed-contacts` (powrót po `snoozed_until`) — osobny sprint, weryfikujemy tylko że `snoozed_from_category` się zapisuje.
- Trigger `log_deal_category_change` — bez zmian.

## DoD

| Check | Stan |
|---|---|
| Migracja utworzona z rollbackiem, deployed | ⬜ |
| `to_regclass('public.deal_team_activity_log')` zwraca nazwę | ⬜ |
| `relrowsecurity = true`, policy `dtal_select` na SELECT | ⬜ |
| `useDealsTeamContacts.ts:296–304` uproszczone — diff before/after | ⬜ |
| Klik „Odłóż" na Bogdanie → toast sukces, karta znika z kanbana | ⬜ |
| `deal_team_contacts` Bogdana: `category='10x'`, `snoozed_until='2026-05-21'`, `snoozed_from_category='audit'` | ⬜ |
| `deal_team_activity_log`: nowy wiersz `action='category_changed'`, `old.category='audit'`, `new.category='10x'`, `actor_id='98a271e8-...'` | ⬜ |
| Regresja 8 przycisków (Wyślij ofertę / Audyt / Klient / Utracony / Umów / Spotkanie / Zadzwoń / Mail) — działa bez błędów | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

