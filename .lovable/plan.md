

# Sprint 06 — Sovra UI + context injection (zaadaptowany)

## Korekty względem sprint MD

- **Schema fix RPC**: `consultations` nie istnieje → użyję `meetings.scheduled_at`. `deal_team_contacts.deal_team_id` nie istnieje → `team_id`. `tasks` używa `assigned_to`. SQL z sprintu jest błędny (dwa razy `FROM tasks`, GROUP BY sub) — przepisuję od nowa.
- **Stare chaty**: nie istnieją w `src/` (skasowane w S04). Punkt 10 sprintu pomijam.
- **DealDetail nie istnieje**: jest `DealsTeamDashboard` + dialogi. Context provider doklejam tylko do `ContactDetail` + `ProjectDetail` (+ `MeetingDetail` jako bonus). Deal scope wstrzykiwany przez query string `?context=deal&id=...` z dialogu szansy.
- **SovraSidebar już istnieje** — dodaję filtr per scope_type, nie tworzę od zera.
- **`SovraPanel` / `SovraContext`**: nowy lekki `useSovraScope` (Zustand) zamiast React Context-piramidy (zgodnie z project-knowledge: „Bez Context-piramid"). Komponenty domain-specific używają `<SovraOpenButton scope_type scope_id />` który nawiguje do `/sovra?context=...&id=...` — to już działa w `Sovra.tsx`.

## Zakres

### A. Migracja SQL `supabase/migrations/<ts>_sprint06_sovra_analytics.sql`

```sql
-- snapshot funkcji (audyt)
CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.functions_snapshot_20260418 AS
  SELECT routine_name, routine_type, data_type
  FROM information_schema.routines WHERE routine_schema = 'public';

-- 1. rpc_task_analytics
CREATE OR REPLACE FUNCTION public.rpc_task_analytics(
  p_range jsonb,
  p_filters jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH filtered AS (
    SELECT t.status, t.due_date
    FROM public.tasks t
    WHERE t.tenant_id = public.get_current_tenant_id()
      AND t.created_at >= (p_range->>'from')::timestamptz
      AND t.created_at <  (p_range->>'to')::timestamptz
      AND (p_filters->>'assigned_to' IS NULL OR t.assigned_to::text = p_filters->>'assigned_to')
      AND (p_filters->>'status' IS NULL OR t.status = p_filters->>'status')
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'completed', (SELECT count(*) FROM filtered WHERE status = 'done'),
    'overdue',   (SELECT count(*) FROM filtered WHERE due_date < current_date AND status <> 'done'),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, c) FROM (
        SELECT COALESCE(status,'unknown') AS status, count(*)::int AS c
        FROM filtered GROUP BY 1
      ) s
    ), '{}'::jsonb)
  );
$$;

-- 2. rpc_team_report (meetings zamiast nieistniejących consultations)
CREATE OR REPLACE FUNCTION public.rpc_team_report(
  p_week_start date,
  p_team_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'week_start', p_week_start,
    'team_id', p_team_id,
    'deals_created', (
      SELECT count(*) FROM public.deal_team_contacts dtc
      WHERE dtc.tenant_id = public.get_current_tenant_id()
        AND (p_team_id IS NULL OR dtc.team_id = p_team_id)
        AND dtc.created_at >= p_week_start
        AND dtc.created_at <  p_week_start + interval '7 days'
    ),
    'meetings_held', (
      SELECT count(*) FROM public.meetings m
      WHERE m.tenant_id = public.get_current_tenant_id()
        AND m.scheduled_at >= p_week_start
        AND m.scheduled_at <  p_week_start + interval '7 days'
    ),
    'tasks_completed', (
      SELECT count(*) FROM public.tasks t
      WHERE t.tenant_id = public.get_current_tenant_id()
        AND t.status = 'done'
        AND t.updated_at >= p_week_start
        AND t.updated_at <  p_week_start + interval '7 days'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.rpc_task_analytics(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_team_report(date, uuid) TO authenticated;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.rpc_task_analytics(jsonb, jsonb);
-- DROP FUNCTION IF EXISTS public.rpc_team_report(date, uuid);
```

### B. Edge functions

**`supabase/functions/sovra/tools.ts`** — dodaję 2 read tools:
- `get_task_analytics(range:{from,to}, filters?:{assigned_to?,status?})` → RPC `rpc_task_analytics`
- `get_team_report(week_start, team_id?)` → RPC `rpc_team_report`
- Dopisuję do `READ_TOOLS` set + handlery w `executeReadTool`.

**`supabase/functions/sovra/index.ts`** — przy budowaniu `ScopeContext` dla scope_type ∈ {contact, project, deal, meeting} pobieram z DB skrótowe info (nazwa, BI summary, status, deadline) i przekazuję jako `scope_label` + `scope_summary` do `buildSovraPrompt`.

**`supabase/functions/_shared/prompts/sovra.v1.ts`** — dopisek:
- "Dla analityki — zawsze używaj `get_task_analytics` lub `get_team_report`. Nie zgaduj liczb."
- Dla scope=contact → "BI summary: …, firma: …" w `scope_summary` (już mamy mechanizm — rozszerzam buildScopeContext).

### C. Frontend

**Nowy `src/components/sovra/SovraOpenButton.tsx`**
- Mały button z ikoną Sparkles + label "Zapytaj Sovrę".
- Props: `scope_type`, `scope_id`, opcjonalny `variant`.
- onClick → `navigate('/sovra?context={type}&id={id}')`.
- Wstawiany w: `ContactDetailHeader`, `ProjectDetail` header, `MeetingDetail` header, dialog szansy w `DealsTeamDashboard`.

**`src/components/sovra/SovraSidebar.tsx`** — dodaję filtr po scope:
- Tabs/Select: "Wszystkie | Kontakty | Projekty | Szanse | Spotkania | Globalne".
- Przekazuje filter do `useSovraSessions(scopeFilter)`.

**`src/hooks/useSovraSessions.ts`** — opcjonalny argument `scopeFilter`.

**`src/components/sovra/SovraMessages.tsx` (lub nowy `SovraExportButton`)**:
- Przycisk "Eksportuj do notatki" w stopce konwersacji.
- Stub: toast "Funkcja dostępna po Sprincie 11 (Workspace)". Bez edge fn na razie.

**`src/components/sovra/SovraFallbackBanner.tsx`** (nowy):
- Mały baner pokazany gdy ostatni response zwrócił 503/504 (lub network error).
- "Sovra chwilowo niedostępna. Spróbuj za moment." + Retry button.
- Hook `useSovraChat` setuje `lastError` state → Sovra page renderuje banner.

**`src/hooks/useSovraChat.ts`** — dodaję `lastError: 'unavailable' | null` + `clearError()` + retry helper.

### D. Kolejność wykonania

1. Migracja SQL (snapshot + 2 RPC + GRANT).
2. `tools.ts` — 2 nowe tools + execute.
3. `sovra/index.ts` — rozbudowa `buildScopeContext` (fetch skrótu dla contact/project/deal/meeting).
4. `prompts/sovra.v1.ts` — dopisek o analytics tools.
5. FE: `useSovraSessions` (filter), `SovraSidebar` (filter UI), `SovraOpenButton` + wstawienie w ContactDetailHeader/ProjectDetail/MeetingDetail/DealsTeamDashboard, `useSovraChat` (lastError), `SovraFallbackBanner`, eksport-stub button.
6. Build + smoke.

### E. DoD

- [ ] `/contacts/:id` ma button "Zapytaj Sovrę" → otwiera `/sovra?context=contact&id=…`, conversation ma scope_type='contact', scope_id=contact.id, prompt zawiera "BI summary"/"Firma".
- [ ] To samo dla projektu, spotkania, dialogu szansy.
- [ ] "Ile mam zadań w tym tygodniu?" → wywołanie `get_task_analytics` z poprawnym range.
- [ ] Sidebar Sovra ma filtr scope (kontakty/projekty/szanse/spotkania/globalne/wszystkie).
- [ ] Banner fallback pokazuje się przy 503/504.
- [ ] Confirmation modal write-tools (z S05) nadal działa.
- [ ] Stub "Eksportuj do notatki" → toast.

### F. Ryzyka

- R1: Sovra `index.ts` musi sięgnąć po BI summary kontaktu — sprawdzę czy jest tabela `contact_bi`. Jeśli brak → zostawiam tylko full_name + company_name (bez summary).
- R2: `tasks` zakres tygodnia — używam `created_at` per sprint MD; alternatywa to `due_date`. Konsultuję default na `created_at`.
- R3: DealsTeamDashboard ma kilka dialogów — wstawiam button tylko w głównym `DealCard`/`ContactDealView` aby nie zaśmiecać UI.

