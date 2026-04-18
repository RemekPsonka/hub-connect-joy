

# Sprint 11 — Workspace 2.0 cz.1 (zaadaptowany)

## Korekty względem sprint MD

1. **`Workspace.tsx` już istnieje** jako cockpit tygodniowy (schedule + day cards + projekty). Sprint MD nadpisuje go gridem KPI/notatek. **Decyzja:** zachowuję istniejący widok jako tab „Tydzień" w nowym `/workspace`, dodaję tab „Cockpit" z gridem KPI/notes/AI/calendar. Custom instructions: „nie twórz nowych stron jeśli istnieje równoważna". Default tab = Cockpit.
2. **`workspace_topics`** ma 1 wiersz i **jest aktywnie używany** w `src/hooks/useWorkspace.ts` (`useWorkspaceTopics`, `useCreateTopic`, `useToggleTopicResolved`) oraz prawdopodobnie w komponentach projektów. **Nie DROPuję** — tylko archiwizuję `archive.workspace_topics_backup_20260418` na wszelki wypadek, tabela zostaje. Sprint MD pkt 1 (DROP) odrzucam — narusza konstytucję „dane produkcyjne, NIGDY DROP bez powodu", a tabela ma żywy hook.
3. **`workspace_schedule` zostaje** (zgodnie z MD).
4. **RPC KPI** — w MD `prospects` używa `tenant_id`, sprawdzam zgodność. `tasks` ma `tenant_id/status/due_date` ✅. `prospects` i `contacts` zakładam że mają `tenant_id` — zweryfikuję w migracji. Dodam `deals_team_contacts` MTD revenue jako 4. metrykę i `contacts_new` (utworzeni w okresie) jako 5.
5. **react-grid-layout** — niewymieniony w „Stack" custom instructions, ale custom instructions też zakazują dodawania bibliotek bez wskazania. Sprint MD jawnie wymaga → akceptuję jako wyjątek (jedna nowa biblioteka grid + 4 tiptap).
6. **tiptap** — 4 paczki: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-placeholder`.
7. **Sidebar** — dodaję nawigację jeśli `/workspace` jeszcze nie ma (mam, jest aktywny route).

## A. Migracja SQL `supabase/migrations/<ts>_sprint11_workspace.sql`

1. `archive.workspace_topics_backup_20260418` (CREATE TABLE AS) — bez DROP.
2. `workspace_notes` (id, tenant_id, actor_id, title, blocks jsonb, pinned bool, parent_note_id, position, created_at, updated_at) + indeks `(actor_id, pinned DESC, updated_at DESC)`.
3. `workspace_widgets` (id, tenant_id, actor_id, widget_type CHECK kpi/note/ai_recs/calendar, config jsonb, grid_x/y/w/h int, size, created_at) + indeks `(actor_id)`.
4. RLS na obu: `actor_id = get_current_director_id() AND tenant_id = get_current_tenant_id()` SELECT/INSERT/UPDATE/DELETE.
5. Trigger `updated_at` na `workspace_notes`.
6. RPC `rpc_workspace_kpi(p_metric, p_range)` zwracający jsonb. Metryki: `contacts_active`, `contacts_new`, `tasks_today`, `prospects_new`, `deals_revenue_mtd` (suma value z `deal_team_contacts` w okresie). SECURITY INVOKER, search_path=public.
7. Komentarz `-- ROLLBACK:` (DROP nowych tabel + funkcji, restore topics niepotrzebny — nie usuwałem).

## B. Frontend

**Nowe hooki:**
- `src/hooks/useWorkspaceNotes.ts` — `useWorkspaceNotes()`, `useCreateNote`, `useUpdateNote` (debounce już w komponencie), `useDeleteNote`, `useTogglePin`.
- `src/hooks/useWorkspaceWidgets.ts` — `useWorkspaceWidgets()`, `useUpsertWidget`, `useRemoveWidget`, `useUpdateWidgetLayout` (batch dla react-grid-layout `onLayoutChange`).
- `src/hooks/useWorkspaceKPI.ts` — `useWorkspaceKPI(metric, range)` → RPC.

**Nowe komponenty (`src/components/workspace/widgets/`):**
- `KPIWidget.tsx` — duża liczba + label, `useWorkspaceKPI`. Konfig metric/range z propsa (z `widget.config`).
- `NoteWidget.tsx` — tiptap editor (StarterKit + TaskList + TaskItem + Placeholder). Auto-save 2s debounce → `useUpdateNote`. Toolbar minimalny (heading, list, todo, code).
- `AIRecsWidget.tsx` — placeholder „Dostępne po Sprincie 12".
- `CalendarWidget.tsx` — placeholder „Dostępne po Sprincie 12".
- `WidgetGrid.tsx` — `react-grid-layout` ResponsiveGridLayout, mapuje `workspace_widgets` → komponenty. `onLayoutChange` → `useUpdateWidgetLayout`.
- `AddWidgetMenu.tsx` — popover z 4 typami → `useUpsertWidget`.

**Edycja `src/pages/Workspace.tsx`:**
- Owijam istniejący widok w `<Tabs>` z `Cockpit` (default, nowy WidgetGrid) + `Tydzień` (istniejący schedule).
- Header zostaje, taby pod nim.

**Edycja `src/components/sovra/SovraExportButton.tsx`:**
- Z toast-stub na rzeczywiste wywołanie `supabase.functions.invoke('workspace-create-note-from-sovra', { body: { conversation_id, title? }})`.
- Toast sukces + link `Otwórz` → `navigate('/workspace?tab=cockpit&note=' + note_id)`.
- Props: `conversationId: string`. Update call-site w `SovraChat`/`Sovra.tsx`.

## C. Edge Function

`supabase/functions/workspace-create-note-from-sovra/index.ts`:
- POST `{ conversation_id, title? }`.
- `requireAuth(req)` z `_shared/auth.ts`.
- SELECT `ai_messages` WHERE `conversation_id` ORDER created_at.
- Buduj tiptap doc JSON: `[heading h1 = title || 'Eksport z Sovry'] + per message: heading h3 = role, paragraph = content]`.
- INSERT do `workspace_notes` z `actor_id`/`tenant_id` z auth.
- Zwróć `{ note_id }`. CORS standard.

## D. Kolejność wykonania

1. SQL migracja (archive + 2 tabele + RLS + RPC + trigger).
2. Install dep: `@tiptap/react @tiptap/starter-kit @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-placeholder react-grid-layout`.
3. 3 hooki (notes/widgets/kpi).
4. 4 widgety + WidgetGrid + AddWidgetMenu.
5. Refactor `Workspace.tsx` na taby Cockpit/Tydzień.
6. Edge fn `workspace-create-note-from-sovra`.
7. Update `SovraExportButton` na realny call.
8. Smoke: `/workspace` renderuje, drag persistuje, tiptap auto-save, Sovra eksport.

## E. DoD
- [ ] `archive.workspace_topics_backup_20260418` istnieje, `workspace_topics` **zostaje** (z hookami).
- [ ] `workspace_notes`, `workspace_widgets` z RLS.
- [ ] `/workspace` ma tab Cockpit (nowy grid) + Tydzień (stare).
- [ ] Drag widgetu zapisuje grid_x/y do DB.
- [ ] NoteWidget tiptap: heading, paragraph, todo list, auto-save 2s.
- [ ] Sovra „Eksportuj do notatki" → wpis w `workspace_notes` + toast z linkiem.

## F. Ryzyka
- **R1** `react-grid-layout` typings — wymaga `@types/react-grid-layout`. Dodam.
- **R2** Tiptap SSR/Vite — działa bez konfiguracji w Vite, ale `useEditor` musi być w client component (jest, Vite czysty CSR).
- **R3** Konflikt z istniejącym `WorkspaceNotes.tsx` (per-projekt notatki). **Nie ruszam** — to inna domena (project_notes). Nowe `workspace_notes` = personal notes Remka.
- **R4** RPC `deals_revenue_mtd` — sprawdzę czy `deal_team_contacts` ma `value` i `tenant_id` w trakcie pisania migracji; jeśli nie, fallback na `prospects_new`.
- **R5** Konstytucja zabrania DROP `workspace_topics` mimo MD — zostaje, hooki działają dalej. MD pkt 1 świadomie odrzucony.

