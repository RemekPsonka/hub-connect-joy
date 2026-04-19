
## Diagnoza: „Remigiusz" vs „Moje" w selektorze zespołu SGU

### Co widzi user
Na `/sgu/pipeline` selektor zespołu pokazuje dwie pozycje, które dla Remka (jednoosobowego użytkownika SGU) wyglądają jak duplikat: zespół „Remigiusz" i zespół „Moje" — ale dane (kontakty/lejek) są różne.

### Hipoteza
W `deal_teams` dla tenanta Remka są **dwa różne zespoły** w których jest członkiem:
1. „SGU" (lub „Remigiusz"/„Moje" — jeden z nich) — właściwy zespół SGU (`team_type='sgu'` albo po nazwie), gdzie `team_id = 9842c3d4-c2a4-4d2b-9e35-afa7fb8d6a57` (znany z planu sidebar).
2. Drugi zespół CRM-owy/osobisty — historyczny rekord (np. utworzony przy seedzie, „Moje" jako default per-director albo „Remigiusz" jako personal team).

Selektor zespołu w `/sgu/pipeline` (komponent prawdopodobnie `TeamSelector` w `DealsTeamDashboard`) pobiera **wszystkie** zespoły do których user ma dostęp (przez `deal_team_members`), a nie filtruje do `team_type='sgu'`. Przez to user-SGU widzi również niezwiązany z SGU zespół CRM-owy → różne dane lejka.

### Plan naprawy

**Krok 1 — Recon (przed kodem):**
1. `supabase--read_query`: sprawdzić w `deal_teams` ile zespołów jest dla tenanta Remka, ich `name`, `team_type`/jakkolwiek się to pole nazywa, kto jest w `deal_team_members` dla każdego.
2. Znaleźć komponent selektora zespołu w `/sgu/pipeline` (najpewniej w `src/pages/DealsTeamDashboard.tsx` lub `src/components/deals-team/TeamSelector.tsx`) i hook który ładuje listę zespołów (`useDealTeams` / `useTeamsForUser`).
3. Sprawdzić czy w trybie SGU (`useLayoutMode().mode === 'sgu'`) jest forsowany konkretny `teamId` (`forcedTeamId` znany z `DealsTeamDashboard`), czy selektor mimo wszystko pokazuje wybór.

**Krok 2 — Fix (jedna z dwóch ścieżek, zależnie od recon):**

**Wariant A** (najpewniej): selektor w trybie SGU NIE powinien być widoczny — pokazujemy nazwę zespołu jako label (read-only). `forcedTeamId` z `useSGUTeamId()` jest pojedynczy i twardy. Schowam selektor pod `mode === 'sgu'` i wyświetlę tylko nazwę zespołu „SGU" lub po prostu usunę widget.

**Wariant B**: jeśli realnie są dwa SGU-typowane zespoły (mało prawdopodobne dla Remka) — przefiltrować listę do `team_type='sgu'` w hooku.

**Wariant C**: jeśli jeden z zespołów to legacy/duplikat („Moje" = stary personal team, „Remigiusz" = nowy SGU) — zarchiwizować duplikat zgodnie z project-knowledge (`archive.deal_teams_backup_YYYYMMDD` + DELETE / soft delete). To wymaga zmiany DB — zrobię tylko po potwierdzeniu po recon.

### Pliki (oczekiwane do edycji)
- `src/pages/DealsTeamDashboard.tsx` — ukrycie selektora w trybie SGU
- ewentualnie `src/components/deals-team/TeamSelector.tsx` lub równoważny — filter `team_type='sgu'` dla SGU mode
- ewentualnie migracja archiwizacyjna duplikatu (wariant C) — tylko po Twoim OK

### Co teraz zrobię
Najpierw recon (DB query + lokalizacja selektora), potem konkretny patch. Bez zmian DB w tym kroku — tylko FE fix selektora. Jeśli okaże się że to duplikat w DB i wymaga merge'u — wrócę z osobnym planem migracji.

### Brak zmian backend/DB w fazie 1. Build + lista plików po wdrożeniu.
