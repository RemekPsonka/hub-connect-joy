
Sprint 19b — 4 sekcje. Plan poniżej.

## A. Sidebar cleanup
W `AppSidebar.tsx` `aiItems` ma już TYLKO `Sovra` (sprawdziłem aktualny stan w kontekście — linia ~99). Brak `MessageSquare`/`Search` w imporcie lucide. **Sekcja A: nic do roboty, raportuję jako "already done".**

## B. unified_meetings COMMENT
Migracja `20260419102000_sprint19b_unified_meetings_comment.sql`:
```sql
COMMENT ON VIEW public.unified_meetings IS
  'Unia consultations + group_meetings. DECYZJA Sprint 19b: one_on_one_meetings CELOWO POMINIĘTE — one-on-one jest podtypem group_meeting i jest widoczne w detalu grupowego. Nie dodawać do UNION bez warsztatu z Remkiem.';
```

## C. Kasacja edge functions — protokół
Krok 1: `code--exec` listing `supabase/functions/` (które z 20 fn faktycznie są w repo).
Krok 2: jeden `grep -rn` w `src/` po wszystkich 20 nazwach + dodatkowe na `useContactAgent`/`ContactAgentSection` żeby zobaczyć co woła.
Krok 3: `supabase--read_query` na `cron.job` dla wszystkich potencjalnych cron-fn (`sovra-morning-session`, `sovra-debrief`, `sovra-weekly-report`, `sovra-suggest-contacts`, `sovra-reminder-trigger`, `sovra-generate-embeddings`).

Decyzje na bazie wyników:
- grep=0 i cron=0 → kasuję folder + sekcję `[functions.<n>]` w `config.toml` + wywołuję `supabase--delete_edge_functions`.
- grep>0 (poza ContactAgent path) → ZOSTAW + raport.
- ContactAgent (`query-contact-agent`, `initialize-contact-agent`, ewentualnie `turbo-agent-query`) → ZOSTAW jeśli grep pokazuje użycie w `useContactAgent.ts`/`ContactAgentSection.tsx`.
- Cron znaleziony → migracja `20260419103000_sprint19b_drop_dead_crons.sql` z `cron.unschedule(jobid) ...` PRZED kasacją funkcji. Jeśli żaden cron nie istnieje — migracja niepotrzebna, pomijam.

`config.toml`: usuwam tylko sekcje aktywne dla skasowanych fn (obecnie widzę `sovra-reminder-trigger` i `sovra-weekly-report` w `[functions.*]` z `verify_jwt = false` — jeśli zostaną skasowane to też leci sekcja).

## D. Migracja archive prospects
Migracja `20260419104000_sprint19b_move_deprecated_prospects_to_archive.sql` — dokładnie jak w spec (snapshot policy + counts + `ALTER TABLE ... SET SCHEMA archive` + weryfikacja).

Najpierw `supabase--read_query` żeby potwierdzić że obie tabele istnieją w `public` (sanity check przed migracją).

## Kolejność wykonania
1. `code--exec ls supabase/functions/` + grep wszystkich 20 nazw w `src/` (równolegle).
2. `supabase--read_query` na `cron.job` (filtr po nazwach fn) + na `information_schema.tables` dla `deprecated_*_20260418` (równolegle).
3. Sekcja B: napisz migrację COMMENT (mały plik).
4. Sekcja C: dla każdej fn z grep=0 → `code--exec rm -rf supabase/functions/<n>` + edycja `config.toml` (jeden `code--line_replace` dla wielu sekcji). Następnie `supabase--delete_edge_functions` z listą.
5. Jeśli cron znaleziony — migracja crons (opcjonalna).
6. Sekcja D: migracja prospects.
7. `npm run lint` w tle.
8. Raport końcowy: 3 listy (usunięte / zostawione z powodem / wymagające decyzji Remka) + status migracji + nota o A "already done".

Bez zmian w `useContactAgent.ts`/`ContactAgentSection.tsx`. Bez DROP tabel (tylko SET SCHEMA). Bez zmian w `unified_meetings` definicji (tylko COMMENT).

## Pytania / uwagi
- Jeśli grep dla `turbo-agent-query` pokaże użycie w ContactAgent → ZOSTAJE (zgodnie z spec).
- Jeśli okaże się że któryś `sovra-*` cron jest aktywny ale Remek go używa (np. weekly-report) — zatrzymuję kasację i raportuję. Spec mówi "stare Sovra podfunkcje przed S04 konsolidacją", ale `sovra-weekly-report` ma sekcję w `config.toml` (verify_jwt=false) — może być nadal aktywny. Sprawdzę cron + grep i zdecyduję per-case w raporcie.
