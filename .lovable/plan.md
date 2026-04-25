## Cel
Dodać 5. typ eventu `milestone_reached` w sekcji "Historia kontaktu" pod kartą w odprawie — pokazywać kamienie milowe (K1/K2/K2+/K3/K4/Utracony) na podstawie kolumn `*_at` z `deal_team_contacts`.

## Pre-flight (zrobione)
SELECT na `information_schema.columns` potwierdza, że wszystkie 7 kolumn istnieje na `deal_team_contacts`: `offering_stage`, `k1_meeting_done_at`, `handshake_at`, `poa_signed_at`, `audit_done_at`, `won_at`, `lost_at`.

## Zmiany

### 1. `src/hooks/odprawa/useContactHistory.ts`
- Rozszerzyć `HistoryEventType` o `'milestone_reached'`.
- Rozszerzyć interfejs `ContactCurrent` o 6 pól `*_at: string | null`.
- Zmienić `.select('offering_stage')` na `.select('offering_stage, k1_meeting_done_at, handshake_at, poa_signed_at, audit_done_at, won_at, lost_at')` w `contactRes`.
- Po pętli notes (`activity`) dodać blok generujący eventy z tablicy 6 milestones (K1, K2 Handshake, K2+ POA, K3 Audyt, K4 Klient, Utracony) — każdy `if (!value) continue` + `events.push({ id: 'milestone:<col>', type: 'milestone_reached', timestamp: value, label, detail: null, actorName: 'System' })`.
- Sortowanie DESC i `slice(0, HISTORY_LIMIT)` już istnieje — milestones wpadną automatycznie.

### 2. `src/components/sgu/odprawa/ContactHistoryPanel.tsx`
- Zaimportować `Flag` z `lucide-react`.
- Dodać do mapy `ICONS`: `milestone_reached: Flag`.

## Smoke test
Otworzyć /sgu/odprawa, kontakt Robert Karczewski → sekcja "Historia kontaktu" pokazuje dodatkowo wpisy K1/K2/K2+/K3/K4 (te które mają non-null `*_at`), wymieszane chronologicznie z decyzjami, tasks completed i notes.

## Commit
`feat(odprawa): ODPRAWA-HISTORY-MILESTONES — 5. typ eventu milestone_reached w historii kontaktu`

## Pliki dotknięte
- `src/hooks/odprawa/useContactHistory.ts` (edit)
- `src/components/sgu/odprawa/ContactHistoryPanel.tsx` (edit)
