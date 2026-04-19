
## Sprint SGU-05 — Prospecting manual + CSV import

### Recon (READ-ONLY, równolegle przed implementacją)

**Tool calls round 1:**
1. `supabase--read_query` × 4 (równolegle):
   - `contacts` NOT NULL pola (co musi być w minimalnym INSERT z edge fn).
   - `deal_team_contacts.contact_id` is_nullable (potwierdzenie wariantu A).
   - rozkład `category` + `status` w SGU teamie (już częściowo z SGU-04 reconu — re-fetch dla pewności).
   - `contacts.source` distinct values (free-text czy enum).
2. `code--exec` lub `code--view package.json` — `papaparse` w deps?
3. `code--view src/pages/DealsTeamDashboard.tsx` (bieżący stan po SGU-04) — gdzie wpiąć CTA bar warunkowo `mode==='sgu' && view==='prospecting'`.
4. `code--search_files` — `ProspectingTab|view=prospecting|prospecting` w `src/components/deals-team/` — czy jest dedykowany komponent (`ProspectingTab.tsx` z importu w SGU-01) czy renderowany inline.
5. `code--view src/components/deals-team/ProspectingTab.tsx` (jeśli istnieje) — gdzie dodać CTA bar + akcje wierszowe (Oznacz jako klient / Archiwizuj).
6. `code--view supabase/functions/sgu-push-contact/index.ts` (z SGU-02) — reuse patternu auth + cors + tenant guard.
7. `code--view src/components/sgu/PushToSGUDialog.tsx` (z SGU-02) — reuse patternu RHF+Zod+invoke+toast.
8. `code--list_dir src/components/sgu` — sprawdzenie istniejących komponentów po SGU-04.

Wypisuję 8-pkt status (OK/BRAK + cytaty).

### Implementacja (po reconie, 1 batch)

**A. Migracja SQL** `supabase/migrations/<ts>_sgu_05_prospecting.sql` (dokładnie wg specu):
- Archive snapshot `archive.deal_team_contacts_backup_20260419_sgu05`.
- `CREATE TABLE sgu_csv_import_presets` z `UNIQUE (tenant_id, name)`.
- Index `(tenant_id, last_used_at DESC NULLS LAST)`.
- RLS enable + 4 policies (select/insert/update/delete) — partner/director/superadmin.
- Trigger `tg_sgu_csv_presets_touch_updated_at` na BEFORE UPDATE.
- DO $$ verification block + komentarz `-- ROLLBACK:`.
- **Wariant A**: NIE ruszamy `deal_team_contacts.contact_id` constraintu — edge fn tworzy minimalny `contacts` row.

**B. Edge function** `supabase/functions/sgu-add-lead/index.ts`:
- CORS + `verifyAuth` (reuse `_shared/auth.ts`).
- RPC: `has_sgu_access`, `get_current_director_id`, `get_sgu_team_id`, `get_current_tenant_id`.
- Walidacja inline (full_name min 2, phone PL regex, email basic, premium ≥0).
- Dedup query po `(team_id, contacts.phone OR contacts.email)` → 200 z `duplicate:true` (nie 409).
- INSERT `contacts` (minimalny: tenant_id, full_name, phone, email, source=`sgu_<src>`, created_by_user_id).
- INSERT `deal_team_contacts` (tenant_id, team_id, contact_id, source_contact_id=NULL, category='lead', status='new', expected_annual_premium_gr=PLN×100, notes).
- Response: `{ deal_team_contact_id, contact_id, created, duplicate }`.

**C. Edge function** `supabase/functions/sgu-import-leads/index.ts`:
- Body: `{ leads: [], source, preset_name? }`. Limit 500/request.
- Pre-fetch dedup: 1 query do `deal_team_contacts JOIN contacts` w SGU teamie → Set<phone>+Set<email>.
- Pętla: filter dedup → batch INSERT contacts (z `RETURNING id`) → batch INSERT deal_team_contacts.
- Jeśli `preset_name` → UPSERT do `sgu_csv_import_presets` (touch usage_count + last_used_at).
- Response: `{ inserted, skipped_duplicates, errors: [{row, message}] }`.

**D. Hooki** (`src/hooks/`)
- `useSGUProspects.ts` — query `deal_team_contacts` z `team_id=sguTeamId AND category IN ('lead','prospect')` + JOIN `contacts`. Filtry: source, status, assignee, search. Reference-only dla `source_contact_id IS NOT NULL` (reuse `useCRMContactBasic` z SGU-02 — albo indykuje że dane mają być pobrane per wiersz przez `<SGUContactName>` jeśli istnieje).
- `useCSVImportPresets.ts` — list + upsert + touch (mutations). QueryKey `['sgu-csv-presets', tenantId]`.

**E. Komponenty** (`src/components/sgu/`)
- `AddLeadDialog.tsx` — RHF + Zod schema (wg specu); `supabase.functions.invoke('sgu-add-lead')`. Duplicate handling → AlertDialog z linkiem `?highlight=<id>`. Toast + invalidate `['sgu-prospects']`.
- `ImportLeadsDialog.tsx` — 4-step wizard z stanem `step`:
  - **upload**: shadcn dropzone + `papaparse.parse(file, { header: true, preview: 5, skipEmptyLines: true })`.
  - **mapping**: `<CSVMappingStep>` + dropdown „Załaduj preset" + input „Nazwa presetu".
  - **preview**: pełny parse + apply mapping + dedup pre-check (RPC `rpc_sgu_check_duplicates(jsonb)` — **dodam do migracji** jako helper, albo prościej: inline check w edge fn `sgu-import-leads` z dry_run flagą; **decyzja**: dry_run flag w `sgu-import-leads` (`{ leads, source, dry_run: true }` zwraca tylko `{ would_insert, would_skip }` bez INSERTów). Mniej kodu SQL, jeden edge fn.
  - **progress**: split na batch 50, sequential invoke, progress bar, summary card.
- `CSVMappingStep.tsx` — controlled component z auto-suggest (regex po headerze).

**F. Modyfikacje**
- `src/components/deals-team/ProspectingTab.tsx` (lub inline w `DealsTeamDashboard` wg recon #4): warunkowo render CTA bar gdy `mode==='sgu' && (isPartner || directorId)`. 3 buttony: „Dodaj lead", „Importuj CSV", „Odśwież". Dialogi mountowane w tym samym komponencie.
- Akcje per wiersz tabeli (`ProspectingTab` row actions): „Oznacz jako klient" (AlertDialog confirm → UPDATE `category='client', status='active'`), „Archiwizuj" (UPDATE `status='inactive'`), „Przypisz do rep" (disabled MVP — placeholder z tooltip „Po SGU-09").
- Badge `SGU-native` dla `source_contact_id IS NULL` + reuse `Z CRM` z SGU-02.
- Filtr „Pokaż zarchiwizowane" (default false).

**G. package.json** — jeśli recon #2 pokaże brak `papaparse` → dodaj `papaparse` + `@types/papaparse` przez `<lov-add-dependency>`.

**H. Walidacja**
- Po migracji types.ts auto-regenerowany (nowa tabela widoczna w `Database['public']`).
- Deploy 2 edge functions.
- `npm run build` + `npm run lint`.
- Smoke test sequence (4 scenariusze z DoD).

### Pliki

**Nowe (7):**
- `supabase/migrations/<ts>_sgu_05_prospecting.sql`
- `supabase/functions/sgu-add-lead/index.ts`
- `supabase/functions/sgu-import-leads/index.ts`
- `src/hooks/useSGUProspects.ts`
- `src/hooks/useCSVImportPresets.ts`
- `src/components/sgu/AddLeadDialog.tsx`
- `src/components/sgu/ImportLeadsDialog.tsx`
- `src/components/sgu/CSVMappingStep.tsx`

**Modyfikowane (1–2):**
- `src/components/deals-team/ProspectingTab.tsx` (CTA bar warunkowy + row actions) — albo `DealsTeamDashboard.tsx` jeśli recon pokaże inny punkt rozszerzenia.
- `package.json` (jeśli papaparse brak).

### Ryzyka / decyzje
- **Wariant A (NOT NULL contact_id)**: edge fn tworzy minimalny `contacts` row. Konsekwencja: każdy SGU lead = 1 row w `contacts` z `source LIKE 'sgu_%'`. **Dobre**: izolacja od CRM Knowledge/BI (RLS contacts już maskuje pola wrażliwe dla SGU userów). **Ryzyko**: jeśli `contacts` ma trigger który automatycznie tworzy `contact_bi`/embeddings → niepotrzebny narzut. Recon #1 zweryfikuje NOT NULL pola; jeśli widoczne triggery (np. `tg_contact_create_bi`), dodam `INSERT ... ON CONFLICT DO NOTHING` lub pominę problematyczne pola. **Decyzja default**: idziemy z minimalnym INSERT, w razie problemu w smoke test → dopisuję IF.
- **Dry-run dedup w preview**: zamiast osobnego RPC dodaję flagę `dry_run` do `sgu-import-leads`. Jedno źródło prawdy dla logiki dedup, mniej kodu SQL.
- **CTA visibility**: tylko `is_sgu_partner() || directorId`. Rep widzi tabelę read-only (zgodnie ze specem).
- **Archiwizacja**: `status='inactive'`, NIE DELETE (zgodnie z project-knowledge: zero DROP/DELETE bez archive).
- **Konwersja lead→client**: tylko UPDATE `category` + `status='active'` (zgodne z mem://features/deals-team/conversion-financial-data-flow — pełny flow konwersji z BI/financial data odkładamy; tu tylko zmiana flagi w SGU prospecting).

### Raport końcowy
1. Lista nowych + modyfikowanych plików (absolute paths).
2. Status migracji + 2 deploye edge functions.
3. Wyniki 8-pkt reconu.
4. Smoke test 4 scenariusze (add/duplicate/import/preset+convert+archive).
5. `npm run build` + `npm run lint`.
6. SQL check ostatnich 10 SGU-native wpisów (`source_contact_id IS NULL`, `contacts.source LIKE 'sgu_%'`).

Po Twojej akceptacji: recon (8 calls równolegle) → implementacja (1 batch) → migracja → deploy edge fns → smoke test → raport.
