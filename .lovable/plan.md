

# BLOK 2 — Milestones K1-K4

## Pre-flight wyniki

| Sprawdzenie | Wynik |
|---|---|
| **A** `ADD COLUMN k1_meeting_done_at` w migracjach | ❌ 0 hits (drift potwierdzony — kolumna używana przez `apply_meeting_decision()` w `20260422171024` i `20260422172920`, ale nigdy `ADD COLUMN`). Live DB: kolumna istnieje. |
| **B** K2-K4 cols (`handshake_at`/`poa_signed_at`/`audit_done_at`/`won_at`) na `deal_team_contacts` | ❌ 0 hits (jeden hit `won_at` w `20260206061741` dotyczy legacy tabeli `deals` — nie naszej). Live DB: brak tych 4 kolumn. |
| **C** trigger `trg_set_milestone_timestamps` / funkcja `set_milestone_timestamps` | ❌ 0 hits (do dodania) |
| **CHECK whitelist** offering_stage (z `20260422173609`) | ✅ **14 wartości**: `decision_meeting`, `handshake`, `power_of_attorney`, `audit`, `offer_sent`, `negotiation`, `won`, `lost`, `meeting_plan`, `meeting_scheduled`, `meeting_done`, `audit_plan`, `audit_scheduled`, `audit_done`. Wszystkie nasze trigger-targets (`meeting_done`, `handshake`, `power_of_attorney`, `audit_done`, `won`) są w whitelist. |
| **D** Skala backfill (live counts) | `handshake`=119, `decision_meeting`=24, `meeting_done`=1, NULL=1. Total=145. Backfill K2a strzeli w 119 wierszy; K1 w 120 (handshake+meeting_done — bo handshake implikuje wcześniejsze K1). K2b/K3/K4=0 (brak kontaktów na tych stage'ach). |

## Zakres (1 plik migracji, 4 sekcje)

**Plik:** `supabase/migrations/20260423180000_blok2_milestones_k1_k4.sql` (~140 LOC)

### A — Drift fix (~3 LOC)
`ALTER TABLE deal_team_contacts ADD COLUMN IF NOT EXISTS k1_meeting_done_at timestamptz;` — domyka P0 drift, żeby `db reset` nie wywalał triggera `apply_meeting_decision`.

### B — Nowe kolumny K2-K4 (~10 LOC)
`ADD COLUMN IF NOT EXISTS` dla `handshake_at`, `poa_signed_at`, `audit_done_at`, `won_at` (wszystkie `timestamptz`, nullable, bez default) + `COMMENT ON COLUMN` dla wszystkich 5 milestone'ów.

### C — Trigger `set_milestone_timestamps` (~40 LOC)
`BEFORE UPDATE OF offering_stage` z `WHEN (NEW.offering_stage IS DISTINCT FROM OLD.offering_stage)`. `SECURITY DEFINER`, `search_path=public`. Mapping stage→column z `COALESCE(NEW.col, now())` (idempotent — pierwsze wejście wygrywa, ręcznie wpisana data historyczna zostaje). **POA implikuje handshake** (stempluje oba). Koegzystuje bez konfliktu z `apply_meeting_decision()` (oba używają COALESCE na `k1_meeting_done_at`, różne triggery na różnych tabelach).

### D — Backfill best-effort (~50 LOC)
5 osobnych `UPDATE`-ów (idempotent: `COALESCE` + `IS NULL` guard) używających `last_status_update` → `updated_at` → `created_at` jako kaskadowy fallback. Dla każdego K-poziomu inkluzywna lista późniejszych stage'ów (np. K1 stempluje wszystkich od `meeting_done` w górę po `won`). Kończy się `RAISE NOTICE` z licznikami K1-K4.

## ZERO zmian w
- Kod TS (`types.ts` regen automatycznie)
- Trigger `apply_meeting_decision()` (zostaje, jego logika K1 koegzystuje)
- CHECK whitelist `offering_stage` (już zawiera potrzebne wartości)
- RLS, inne migracje

## Acceptance criteria
1. `\d+ deal_team_contacts` po `db reset` → 5 kolumn milestone (`k1_meeting_done_at`, `handshake_at`, `poa_signed_at`, `audit_done_at`, `won_at`).
2. `SELECT 1 FROM pg_trigger WHERE tgname='trg_set_milestone_timestamps'` → 1 row.
3. Backfill log po deploy: `K1≈120, K2a≈119, K2b=0, K3=0, K4=0`.
4. Smoke SQL: UPDATE stage→`handshake` stempluje `handshake_at`; potem UPDATE→`power_of_attorney` zostawia `handshake_at` (COALESCE) i ustawia `poa_signed_at`.
5. `npx tsc --noEmit` clean (po regen `types.ts`).

## ROLLBACK (w komentarzu na końcu pliku)
DROP TRIGGER + DROP FUNCTION + ALTER TABLE DROP COLUMN dla 4 nowych (K1 zostaje — był w live).

## Backlog (BLOK 3+)
- UI K1-K4: timeline w ContactDetail, badge na UnifiedKanbanCard, KPI funnel conversion.
- BLOK 3: Odprawa SGU (greenfield).
- BLOK 4: process continuity CHECK + cleanup `estimated_value` legacy + decyzja enum dla `meeting_questions.status`.

