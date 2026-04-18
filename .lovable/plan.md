

# Sprint 02 — Dead code & UI cleanup (finalna wersja)

## Decyzje (potwierdzone)
- K3 `institutions` — pomijamy (nie istnieje)
- K4 — dorzucamy `src/hooks/useResources.ts` + `src/components/resources/`
- K5 `use-toast` — usuwamy `src/components/ui/use-toast.ts`, zostawiamy `src/hooks/use-toast.ts`, importy → `@/hooks/use-toast`
- K6 `src/types/dealTeam.ts` — NIE ruszamy
- `DealDetail.tsx` — kasujemy (używa `useDeals`)
- P1 `linkedin_network_contacts` — ZOSTAJE
- P2 `default_positions` — ZOSTAJE

## Zakres

### A. Strony FE + trasy
Usuwam pliki:
- `src/pages/Index.tsx`, `MyDay.tsx`, `Resources.tsx`, `Superadmin.tsx`, `Tasks.tsx`, `MyTasks.tsx`, `Deals.tsx`, `DealDetail.tsx`
- Cały `src/components/deals/`
- Cały `src/components/resources/`
- `src/hooks/useDeals.ts`, `src/hooks/useDealProducts.ts`, `src/hooks/useResources.ts`

W `src/App.tsx`:
- Usuwam `lazy()` dla skasowanych stron + ich `<Route>`: `/my-day`, `/resources`, `/superadmin`, `/tasks`, `/tasks/analytics`, `/tasks/team-report`, `/my-tasks`, `/deals`, `/deals/:id`
- Usuwam `DealsRedirect` (już niepotrzebny)
- Sprawdzam, czy `/` (Dashboard) ma sensowny fallback — jeśli `Index.tsx` był używany jako fallback, dopinam Dashboard / przekierowanie

W sidebarze (AppSidebar / nav configs): usuwam linki do skasowanych stron.

### B. Edge Functions
- Kasuję foldery `supabase/functions/learn-contact-agent/`, `supabase/functions/sync-contact-agents/`
- Usuwam ewentualne wpisy w `supabase/config.toml`
- Wywołuję `supabase--delete_edge_functions` dla obu

### C. Tabele DB — migracja z archiwizacją
Plik: `supabase/migrations/<ts>_sprint02_dead_tables.sql`

```sql
CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE archive.nela_sessions_backup_20260418 AS SELECT * FROM public.nela_sessions;
CREATE TABLE archive.nela_reminders_backup_20260418 AS SELECT * FROM public.nela_reminders;
CREATE TABLE archive.ai_recommendation_actions_backup_20260418 AS SELECT * FROM public.ai_recommendation_actions;
CREATE TABLE archive.search_synonyms_backup_20260418 AS SELECT * FROM public.search_synonyms;

DROP FUNCTION IF EXISTS public.expand_search_query(text) CASCADE;
DROP FUNCTION IF EXISTS public.add_synonym(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.delete_synonym(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_synonyms() CASCADE;

DROP TABLE IF EXISTS public.nela_reminders CASCADE;
DROP TABLE IF EXISTS public.nela_sessions CASCADE;
DROP TABLE IF EXISTS public.ai_recommendation_actions CASCADE;
DROP TABLE IF EXISTS public.search_synonyms CASCADE;

-- ROLLBACK:
-- CREATE TABLE public.nela_sessions AS SELECT * FROM archive.nela_sessions_backup_20260418;
-- CREATE TABLE public.nela_reminders AS SELECT * FROM archive.nela_reminders_backup_20260418;
-- CREATE TABLE public.ai_recommendation_actions AS SELECT * FROM archive.ai_recommendation_actions_backup_20260418;
-- CREATE TABLE public.search_synonyms AS SELECT * FROM archive.search_synonyms_backup_20260418;
```

Pomijam: `institutions`, `linkedin_network_contacts`, `default_positions`.

### D. Hooki / duplikaty / drobiazgi
- Scalenie `useContactGroups` — jeśli jest re-export w `useContacts`, kierujemy importy na `@/hooks/useContactGroups`
- Usuwam `src/components/ui/use-toast.ts` (re-export)
- Wszystkie importy `@/components/ui/use-toast` → `@/hooks/use-toast` (search & replace)
- `WantedContacts.tsx:1` — usuwam `// rebuild`
- `useBusinessInterview.ts` — usuwam `console.log("[BI Fill]")`
- `NotFound.tsx` — usuwam/wyciszam `console.error`
- NIE ruszam `src/types/dealTeam.ts`

### E. Dokumentacja w repo
Kasuję z root: wszystkie `TRYB_*.md`, `PEŁNA STRUKTURA PLIKÓW PROJEKTU (1).md`, `PEŁNY SYSTEM ZARZĄDZANIA STANEM (1).md`, `INSTRUKCJA_GLOWNA (3).md` (jeśli istnieją w repo).

## Kolejność wykonania
1. Migracja SQL (archiwizacja + DROP)
2. Usunięcie edge functions (kod + `delete_edge_functions`)
3. Usunięcie stron + folderów FE + hooków
4. Aktualizacja `App.tsx` (trasy, lazy, DealsRedirect)
5. Aktualizacja sidebara (linki nav)
6. Toast: usunięcie re-exportu + przepięcie importów
7. Drobne: komentarze, console.*, scalenie `useContactGroups`
8. Kasacja MD-ków z roota
9. Lint pass + sanity check buildu

## Ryzyka
- Sidebar / linki w innych miejscach niż AppSidebar — przeszukam globalnie po routach
- `DealsRedirect` — usuwany razem z `/deals*`
- Importy toast — szeroki search/replace, weryfikuję że nikt nie używał `useToast` z `components/ui/use-toast` ze ścieżką inną niż re-export

