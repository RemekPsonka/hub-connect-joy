## Pre-flight wynik (ścieżka A)

| Check | Wynik |
|---|---|
| A. Triggery milestone na `deal_team_contacts` | **Oba istnieją**: `trg_milestone_timestamps` (duplikat) + `trg_set_milestone_timestamps` (canonical) |
| B. Funkcja `update_milestone_timestamps` | **Istnieje** |
| C. 5 zdublowanych kolumn (`k1_meeting_scheduled_at`, `k2_handshake_at`, `k3_poa_signed_at`, `k4_offer_accepted_at`, `k4_policy_signed_at`) | **Wszystkie istnieją** |
| C+. Kolumny chronione (`audit_done_at`, `k1_meeting_done_at`, `handshake_at`, `poa_signed_at`, `won_at`, `lost_at`) | Wszystkie obecne — będą zachowane |
| D. Wartości w 5 kolumnach | 23 wiersze z dowolną niepustą wartością (k2:23, k3:20, k4_off:19, k4_pol:19, k1_sched:0) |
| Grep `src/`+`supabase/` | Trafienia tylko w auto-gen `src/integrations/supabase/types.ts`. Zero w komponentach/hookach/edge fn. |

**Ścieżka: A** — wykonujemy S4a (DROP triggera+funkcji) + S4b (backup + DROP 5 kolumn). Jedna migracja schema-only.

## Plan migracji

Plik: `supabase/migrations/<timestamp>_etap3_drop_milestone_duplicates.sql`

### S4a — DROP konkurencyjnego triggera
```sql
DROP TRIGGER IF EXISTS trg_milestone_timestamps ON public.deal_team_contacts;
DROP TRIGGER IF EXISTS update_milestone_timestamps_trigger ON public.deal_team_contacts;
DROP FUNCTION IF EXISTS public.update_milestone_timestamps() CASCADE;
```

### S4b — backup + DROP 5 kolumn
```sql
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE archive.deprecated_milestone_columns_backup_2026_04_25 AS
SELECT id AS deal_team_contact_id,
       k1_meeting_scheduled_at, k2_handshake_at, k3_poa_signed_at,
       k4_offer_accepted_at, k4_policy_signed_at,
       now() AS backed_up_at
FROM public.deal_team_contacts
WHERE k1_meeting_scheduled_at IS NOT NULL
   OR k2_handshake_at IS NOT NULL
   OR k3_poa_signed_at IS NOT NULL
   OR k4_offer_accepted_at IS NOT NULL
   OR k4_policy_signed_at IS NOT NULL;
-- oczekiwane: 23 wiersze

ALTER TABLE public.deal_team_contacts
  DROP COLUMN IF EXISTS k1_meeting_scheduled_at,
  DROP COLUMN IF EXISTS k2_handshake_at,
  DROP COLUMN IF EXISTS k3_poa_signed_at,
  DROP COLUMN IF EXISTS k4_offer_accepted_at,
  DROP COLUMN IF EXISTS k4_policy_signed_at;
```

### ROLLBACK (komentarz w pliku migracji)
1. `CREATE OR REPLACE FUNCTION public.update_milestone_timestamps()` z definicją zarchiwizowaną w pre-flight (treść funkcji odczytana, wklejam do komentarza migracji).
2. `CREATE TRIGGER trg_milestone_timestamps BEFORE UPDATE ON public.deal_team_contacts FOR EACH ROW EXECUTE FUNCTION update_milestone_timestamps();`
3. `ALTER TABLE deal_team_contacts ADD COLUMN k1_meeting_scheduled_at timestamptz, ADD COLUMN k2_handshake_at timestamptz, ...;`
4. `UPDATE deal_team_contacts dtc SET k1_meeting_scheduled_at = b.k1_meeting_scheduled_at, ... FROM archive.deprecated_milestone_columns_backup_2026_04_25 b WHERE dtc.id = b.deal_team_contact_id;`

## Po migracji

- Auto-regen `src/integrations/supabase/types.ts` (Lovable robi automatycznie po migracji).
- `npm run tsc` strict — zero referencji do drop'owanych pól (już dziś brak w `src/` poza types.ts).
- Sanity SQL po migracji:
  - `\d deal_team_contacts` — 5 kolumn ZNIKA, `audit_done_at`+pozostałe 5 chronionych ZOSTAJE
  - lista triggerów milestone — został tylko `trg_set_milestone_timestamps`
  - `SELECT count(*) FROM archive.deprecated_milestone_columns_backup_2026_04_25` = 23

## Constraints (zachowane)

- NIE drop: `audit_done_at`, `k1_meeting_done_at`, `handshake_at`, `poa_signed_at`, `won_at`, `lost_at`, `lost_reason`
- NIE modyfikuj: `set_milestone_timestamps`, `trg_set_milestone_timestamps`
- Zero zmian w `src/` (poza auto-gen types.ts)
- Brak nowych testów / audit log
