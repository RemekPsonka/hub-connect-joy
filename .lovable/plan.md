

# Sprint 03 — Lejek + scalenie prospects (zaadaptowany)

## Decyzje (potwierdzone)
- D1: `pipeline_stages` ZOSTAJE (39 wierszy, w użyciu). Kasujemy tylko `pipeline_transitions` (0) i `pipeline_kpi_targets` (1, migracja do JSONB).
- D2: Nowa `prospects` używa `full_name` (nie first/last), spójnie z istniejącymi danymi.
- D3: Stare hooki zachowują pełne API — wewnętrznie czytają z nowej `prospects`, ale nie zmieniam 23 wywołań.

## Stan w bazie (zweryfikowany)
- `pipeline_stages`: **39 wierszy** → zostawiam
- `pipeline_transitions`: **0** → DROP
- `pipeline_kpi_targets`: **1** → migracja → DROP
- `meeting_prospects`: **123 wiersze**, schema: `team_id`, `full_name`, `company`, `position`, `prospecting_status`, `ai_brief TEXT`, `meeting_id`, etc.
- `deal_team_prospects`: **0**, schema: `team_id`, `prospect_name`, `prospect_company`, `prospect_position`, `status`

## Zakres

### A. Migracja SQL `supabase/migrations/<ts>_sprint03_prospects_consolidation.sql`

```sql
CREATE SCHEMA IF NOT EXISTS archive;

-- 1. ARCHIWIZACJA wszystkich 5 tabel (data preservation)
CREATE TABLE archive.pipeline_stages_backup_20260418 AS SELECT * FROM public.pipeline_stages;
CREATE TABLE archive.pipeline_transitions_backup_20260418 AS SELECT * FROM public.pipeline_transitions;
CREATE TABLE archive.pipeline_kpi_targets_backup_20260418 AS SELECT * FROM public.pipeline_kpi_targets;
CREATE TABLE archive.meeting_prospects_backup_20260418 AS SELECT * FROM public.meeting_prospects;
CREATE TABLE archive.deal_team_prospects_backup_20260418 AS SELECT * FROM public.deal_team_prospects;

-- 2. deal_teams.kpi_targets JSONB + migracja z pipeline_kpi_targets
ALTER TABLE public.deal_teams ADD COLUMN IF NOT EXISTS kpi_targets jsonb DEFAULT '{}'::jsonb;
-- (UPDATE wg realnej struktury pipeline_kpi_targets — sprawdzę kolumny w runtime)

-- 3. DROP pipeline_transitions + pipeline_kpi_targets (pipeline_stages ZOSTAJE — D1)
DROP TABLE IF EXISTS public.pipeline_transitions CASCADE;
DROP TABLE IF EXISTS public.pipeline_kpi_targets CASCADE;

-- 4. Nowa public.prospects ze schematem opartym o realne dane (D2)
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('meeting','team','wanted','import')),
  source_id uuid,                          -- team_id (meeting/team) lub null (wanted/import)
  team_id uuid REFERENCES public.deal_teams(id) ON DELETE CASCADE,
  meeting_id uuid,                         -- z meeting_prospects.meeting_id
  full_name text NOT NULL,
  company text,
  company_id uuid REFERENCES public.companies(id),
  position text,
  industry text,
  phone text,
  email text,
  linkedin_url text,
  source_event text,
  source_file_name text,
  status text NOT NULL DEFAULT 'new',      -- mapuje prospecting_status
  priority text,
  is_prospecting boolean DEFAULT true,
  notes text,                              -- prospecting_notes / prospect_notes
  ai_brief jsonb,                          -- {text, generated_at} — TEXT z meeting_prospects opakowany
  ai_brief_generated_at timestamptz,
  converted_to_contact_id uuid REFERENCES public.contacts(id),
  converted_to_team_contact_id uuid,
  converted_at timestamptz,
  imported_by uuid,
  imported_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_prospects_tenant_source ON public.prospects(tenant_id, source_type, source_id);
CREATE INDEX idx_prospects_team ON public.prospects(team_id);
CREATE INDEX idx_prospects_converted ON public.prospects(converted_to_contact_id);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY prospects_select ON public.prospects FOR SELECT USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY prospects_insert ON public.prospects FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());
CREATE POLICY prospects_update ON public.prospects FOR UPDATE USING (tenant_id = public.get_current_tenant_id());
CREATE POLICY prospects_delete ON public.prospects FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- 5. Backfill z meeting_prospects (123 wiersze, real schema)
INSERT INTO public.prospects (
  id, tenant_id, source_type, source_id, team_id, meeting_id,
  full_name, company, position, industry, email, phone, linkedin_url,
  source_event, source_file_name, status, priority, is_prospecting, notes,
  ai_brief, ai_brief_generated_at,
  converted_to_contact_id, converted_to_team_contact_id, converted_at,
  imported_by, imported_at, created_at, updated_at
)
SELECT
  id, tenant_id, 'meeting', team_id, team_id, meeting_id,
  full_name, company, position, industry, email, phone, linkedin_url,
  source_event, source_file_name, COALESCE(prospecting_status,'new'), priority, is_prospecting, prospecting_notes,
  CASE WHEN ai_brief IS NOT NULL THEN jsonb_build_object('text', ai_brief, 'generated_at', ai_brief_generated_at) END,
  ai_brief_generated_at,
  converted_to_contact_id, converted_to_team_contact_id, converted_at,
  imported_by, imported_at, created_at, updated_at
FROM public.meeting_prospects;

-- 6. Backfill z deal_team_prospects (0 wierszy, ale dla bezpieczeństwa)
INSERT INTO public.prospects (
  id, tenant_id, source_type, source_id, team_id,
  full_name, company, position, email, phone, linkedin_url,
  status, priority, notes, converted_to_contact_id, company_id, created_at, updated_at
)
SELECT
  id, tenant_id, 'team', team_id, team_id,
  prospect_name, prospect_company, prospect_position, prospect_email, prospect_phone, prospect_linkedin,
  COALESCE(status,'new'), priority, prospect_notes, converted_to_contact_id, company_id, created_at, updated_at
FROM public.deal_team_prospects;

-- 7. Deprecation (rename, DROP osobną migracją za 30 dni)
ALTER TABLE public.meeting_prospects RENAME TO deprecated_meeting_prospects_20260418;
ALTER TABLE public.deal_team_prospects RENAME TO deprecated_deal_team_prospects_20260418;

-- 8. Weryfikacja count
DO $$ DECLARE old_c int; new_c int;
BEGIN
  SELECT (SELECT COUNT(*) FROM archive.meeting_prospects_backup_20260418)
       + (SELECT COUNT(*) FROM archive.deal_team_prospects_backup_20260418) INTO old_c;
  SELECT COUNT(*) FROM public.prospects INTO new_c;
  IF old_c <> new_c THEN RAISE EXCEPTION 'COUNT MISMATCH: old=% new=%', old_c, new_c; END IF;
  RAISE NOTICE 'OK: prospects migrated %=%', old_c, new_c;
END $$;

-- ROLLBACK:
-- DROP TABLE public.prospects;
-- ALTER TABLE public.deprecated_meeting_prospects_20260418 RENAME TO meeting_prospects;
-- ALTER TABLE public.deprecated_deal_team_prospects_20260418 RENAME TO deal_team_prospects;
-- CREATE TABLE public.pipeline_transitions AS SELECT * FROM archive.pipeline_transitions_backup_20260418;
-- CREATE TABLE public.pipeline_kpi_targets AS SELECT * FROM archive.pipeline_kpi_targets_backup_20260418;
-- ALTER TABLE public.deal_teams DROP COLUMN kpi_targets;
```

### B. Nowy hook `src/hooks/useProspects.ts`
- Sygnatura: `useProspects({ sourceType, sourceId?, teamId? })`
- CRUD przez `public.prospects`, mapowanie z RLS po `tenant_id`
- Eksportuje: `useProspects`, `useCreateProspect`, `useUpdateProspect`, `useDeleteProspect`

### C. Re-export w starych hookach (D3 — zachowane API)
- `src/hooks/useMeetingProspects.ts`:
  - Pełne API zostaje (`useMeetingProspects`, `useImportMeetingProspects`, `useUpdateMeetingProspect`, `useDeleteMeetingProspect`, `useGenerateProspectBrief`, `useMeetingProspectsByEvent`, typy `MeetingProspect`/`ParsedPerson`)
  - Wewnątrz: zamiana `.from('meeting_prospects')` → `.from('prospects').eq('source_type','meeting')`
  - Mapper: `prospects.row` → `MeetingProspect` (status ↔ prospecting_status, ai_brief jsonb → string z `.text`)
- `src/hooks/useDealsTeamProspects.ts`: analogicznie, source_type='team'
- 23 pliki używające starych hooków — **zero zmian**

### D. Edge function `prospect-ai-brief`
- Body: `{ prospectId }`  
- SELECT z `public.prospects WHERE id=prospectId` (RLS)
- UPDATE `prospects.ai_brief = jsonb_build_object('text', brief, 'generated_at', now())`

### E. Pliki bezpośrednio używające `meeting_prospects`/`deal_team_prospects` przez `supabase.from()`
Refactor (poza hookami):
- `src/components/meetings/MeetingParticipantsTab.tsx` (linia 105)
- `src/components/deals-team/ConvertProspectDialog.tsx` (linia 103)
- `src/components/deals-team/ProspectingConvertDialog.tsx` (linia 311)
- `src/hooks/useMeetings.ts` (linia 251 — JOIN po `meeting_prospects`)

Zamiana na `prospects` z odpowiednim filtrem source_type.

## Kolejność wykonania
1. Migracja SQL (archiwizacja → kpi → prospects → backfill → rename → weryfikacja)
2. `useProspects.ts` (nowy)
3. `useMeetingProspects.ts` + `useDealsTeamProspects.ts` (przepisanie wewnętrzne, API zostaje)
4. Refactor 4 plików z bezpośrednim `.from('meeting_prospects'/'deal_team_prospects')`
5. `prospect-ai-brief/index.ts` — update na `prospects` + JSONB
6. Build + smoke test `/deals-team` (Dashboard, Kanban, Prospecting, Klienci, Ofertowanie, Zadania, Prowizje, Odłożone)

## Ryzyka
- Mapowanie `ai_brief` TEXT→JSONB: hook musi czytać `.text` z jsonb, mutacja musi pakować z powrotem. Zero zmian dla UI.
- `meeting_id` z `meeting_prospects` — dodaję jako pełnoprawną kolumnę w nowej `prospects` (potrzebne dla MeetingParticipantsTab join).
- Backfill 123 wierszy + RLS: tenant_id zachowany 1:1.
- `pipeline_stages` zostaje — Kanban nieruszany (kolejny sprint).

