

# Sprint 07 — BI 2.0 fresh build

## Decyzje (potwierdzone)
- D1: 3 placeholderowe pytania z TODO w `src/lib/bi/questions.v2.ts`. Remek dorzuci 15 finalnych później.
- D2: Kasujemy `src/components/agents/BIInterviewChat.tsx` + `BIDataViewer.tsx` (oraz wszystkie ich importy).
- D3: Usuwamy widget statystyk BI z `Settings.tsx` (`useBIStatistics`, `useContactsWithoutBI` + ich wywołania).
- D4: 13 wierszy `business_interviews` + 3 `bi_ai_outputs` → archive. Odpalamy one-shot migrację `ai_summary` z `business_interviews.ai_output` do nowej `contact_bi`.

## A. Migracja SQL `supabase/migrations/<ts>_sprint07_bi2_schema.sql`
1. Archiwizacja 6 tabel → `archive.*_backup_20260418` + `RAISE NOTICE` z liczbą wierszy.
2. `CREATE TABLE public.contact_bi (contact_id PK→contacts, tenant_id, answers jsonb, ai_summary text, filled_by_ai bool, last_filled_at, updated_at)`. Indeks GIN po `answers` + indeks po `tenant_id`. RLS po `tenant_id = get_current_tenant_id()` (SELECT/INSERT/UPDATE/DELETE).
3. One-shot INSERT z `archive.business_interviews_backup_20260418` (DISTINCT ON contact_id, najnowsze, `ai_summary = COALESCE(ai_output->>'summary', ai_output::text)`, `filled_by_ai=true`).
4. DROP CASCADE 6 starych tabel.
5. Komentarz `-- ROLLBACK:` ze skryptem przywracającym z archive.

## B. Frontend
- **Nowe**:
  - `src/lib/bi/questions.v2.ts` — typ `BIQuestion` + `BI_QUESTIONS_V2` z 3 placeholderami (sekcja `basics`) + `// TODO: Remek dostarcza 15 finalnych pytań`.
  - `src/hooks/useContactBI.ts` — `useContactBI(contactId)` (SELECT) + `useUpsertContactBI` (UPSERT) + `useFillBIFromNotesViaSovra` (nawigacja do Sovry z prefilled message wywołującym tool `fill_bi_from_notes`).
  - `src/components/bi/ContactBI.tsx` — formularz JSON-Schema-driven z `BI_QUESTIONS_V2`, grupowanie po `section`, tryb read-only z przyciskiem „Edytuj", przyciski „Zapisz" i „Wypełnij AI", wyświetlanie `ai_summary` jeśli istnieje.
- **Edycje**:
  - `src/components/contacts/MeetingsTab.tsx` — `<BITab />` → `<ContactBI contactId={contactId} />`.
  - `src/pages/Settings.tsx` — usuń import + użycia `useBIStatistics`/`useContactsWithoutBI` + sekcję wyświetlającą statystyki.
- **Kasacje**:
  - Folder `src/components/bi/sections/` (cały, 19 plików).
  - `src/components/bi/BITab.tsx`, `BIActionBar.tsx`, `BIFillFromNoteDialog.tsx`, `types.ts` (legacy).
  - `src/components/bi/index.ts` → eksportuje tylko nowy `ContactBI`.
  - `src/hooks/useBIInterview.ts`, `src/hooks/useBusinessInterview.ts`.
  - `src/components/agents/BIInterviewChat.tsx`, `src/components/agents/BIDataViewer.tsx`.
  - Sprawdzenie referencji do skasowanych plików (search) — jeśli są, czyszczę.

## C. Edge functions
- **Kasacje** (folder + `supabase/config.toml` jeśli ma wpis):
  - `supabase/functions/bi-fill-from-note/`
  - `supabase/functions/process-bi-ai/`
  - `supabase/functions/bi-agent-interview/`
- **Edycja `supabase/functions/sovra/tools.ts`**:
  - Rejestracja write-toola `fill_bi_from_notes` (args: `{ contact_id: uuid }`, `human_summary`: „Wypełnię BI kontaktu {name} na podstawie notatek i konsultacji. Potwierdzasz?").
  - INSERT do `sovra_pending_actions` z `metadata.tool='fill_bi_from_notes'`.
- **Edycja `supabase/functions/sovra-confirm/index.ts`** (handler nowego toola):
  - Pobranie kontaktu + ostatnich `contacts.notes` + `consultations` (`scheduled_at DESC LIMIT 10`).
  - `callLLM` z systemowym promptem „wypełnij JSON BI na podstawie notatek wg schematu BI_QUESTIONS_V2" (schema embed).
  - UPSERT do `public.contact_bi` z `answers`, `ai_summary`, `filled_by_ai=true`, `last_filled_at=now()`.
  - Persist `tool_results` w `ai_messages`.

## D. Kolejność wykonania
1. Migracja SQL (archive → contact_bi + RLS → migrate ai_summary → DROP).
2. Nowe pliki FE (`questions.v2.ts`, `useContactBI.ts`, `ContactBI.tsx`).
3. Podmiana `MeetingsTab` na nowy komponent.
4. Edge functions: rejestracja toola w `sovra/tools.ts` + handler w `sovra-confirm/index.ts`.
5. Czyszczenie: kasacja folderów/plików + czyszczenie `Settings.tsx` + index.
6. `delete_edge_functions` dla 3 fn. Deploy `sovra` + `sovra-confirm`.
7. Build + smoke.

## E. DoD
- 6 tabel BI nie istnieje w `public`, są w `archive.*_backup_20260418`.
- `public.contact_bi` z RLS działa, ai_summary zmigrowane (≥1 wiersz oczekiwany).
- `/contacts/:id` → tab BI renderuje `<ContactBI/>` z 3 pytaniami placeholder.
- „Wypełnij AI" → otwiera Sovrę → modal Potwierdź → po confirm `contact_bi.answers` i `ai_summary` wypełnione, `filled_by_ai=true`.
- 3 edge fn (`bi-fill-from-note`, `process-bi-ai`, `bi-agent-interview`) skasowane.
- `useBIInterview`, `useBusinessInterview`, `BIInterviewChat`, `BIDataViewer`, `BITab`, `sections/` — usunięte.
- Build zielony, brak orphaned imports.

## F. Ryzyka
- R1: `Settings.tsx` może mieć większy fragment z BI (chips/listę). Zachowam tylko nagłówek sekcji jeśli sąsiaduje z innymi statystykami; w razie czego usunę całą kartę.
- R2: `tasks.contact_id` constraint — nie dotyczy, ale UPSERT contact_bi musi mieć poprawny `tenant_id` (biorę z `contacts.tenant_id` w handlerze).
- R3: LLM może zwrócić niepełny JSON — handler robi `JSON.parse` w try/catch, w razie błędu ustawia tylko `ai_summary` (raw text), `answers` zostaje `{}`.
- R4: Schema `consultations` — używam `scheduled_at` + `notes` (potwierdzone w S06).

