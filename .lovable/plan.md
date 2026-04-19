

## Sprint 18 — Spotkania + Konsultacje scalenie (zaadaptowany)

### Reality check vs MD
Plan MD nie pasuje do obecnego schematu. Konkrety:

1. **`one_on_one_meetings` NIE jest tabelą spotkań 1:1** — to **sub-tabela `group_meetings`** rejestrująca pary osób, które rozmawiały podczas spotkania grupowego (`group_meeting_id` NOT NULL, `contact_a_id`/`contact_b_id`, `outcome`, `was_recommended`). Backfill jako `type='networking'` zniszczyłby semantykę i odetnie od grupowego eventu.
2. **`meeting_participants` już istnieje** — z FK do `group_meetings`, `prospect_id`, `is_member`, `is_new`, `attendance_status`, realtime publication. Tworzenie nowej tabeli o tej samej nazwie się wywali (kolizja).
3. **`consultations` ma 6 child tables** (`consultation_chat_messages`, `consultation_guests`, `consultation_questionnaire`, `consultation_recommendations`, `consultation_thanks`, `consultation_meetings`) + `tasks.consultation_id` FK + 2 triggery (`refresh_dashboard_stats`, `set_updated_at`). Sam RENAME zostawi te FK wskazujące na `deprecated_consultations_*`, ale UI wciąż będzie czytał `consultations` — wszystko padnie.
4. **`useMeetings` hook już istnieje** i operuje na `group_meetings`. Re-write zmieni semantykę dla wszystkich konsumentów `MeetingsList`, `MeetingModal`, `MeetingsHeader`, `MeetingsOverview`, `Dashboard.MeetingsOverview`.
5. **59 plików** referuje stare tabele/hooki, w tym `Dashboard`, `Notifications` (`/consultations/${id}` route), `ContactDetail` (`MeetingsTab` → `ContactConsultationsTab`), `Calendar`, `Sovra` tools.
6. **Dane**: 1 konsultacja, 0 1:1, 2 spotkania grupowe — produkcyjne, ale ilościowo trywialne.

Decyzja: **NIE robię big-bang scalenia w tym sprincie**. Ryzyko: zbyt szerokie blast-radius dla zysku ~3 rekordów. Robię „bridge view" + ujednolicony FE, fizyczne scalanie tabel odkładam do osobnego sprintu deprecation.

### Co robię (adapted scope)

#### A. Migracja `<ts>_sprint18_meetings_unified_view.sql`
- `CREATE SCHEMA IF NOT EXISTS archive;`
- Snapshoty (read-only): `archive.consultations_backup_20260419`, `archive.group_meetings_backup_20260419`, `archive.one_on_one_meetings_backup_20260419`, `archive.meeting_participants_backup_20260419`.
- **NIE** tworzę nowej `public.meetings` (kolizja semantyczna z istniejącym `useMeetings` na `group_meetings`).
- Tworzę **VIEW `public.unified_meetings`** z `UNION ALL`:
  - `consultations` → `(id, type='consultation', tenant_id, scheduled_at, duration=duration_minutes, location, notes, status, contact_id_main=contact_id, source_table='consultations')`.
  - `group_meetings` → `(id, type='group', tenant_id, scheduled_at, duration=duration_minutes, location, notes=description, status, contact_id_main=NULL, source_table='group_meetings')`.
  - (Pomijam `one_on_one_meetings` w widoku — to są wyniki z group_meeting, nie samoistne spotkania. Pokazane w detalu group_meeting.)
- VIEW z `security_invoker = true` (RLS jest na tabelach źródłowych, więc filtrowanie per-tenant zadziała).
- Indeksy istnieją na źródłach — view nie wymaga.
- ROLLBACK: `DROP VIEW unified_meetings;` + `DROP TABLE archive.*_backup_20260419;`.

#### B. Frontend
- **Nowy `src/hooks/useUnifiedMeetings.ts`**:
  - `useUnifiedMeetings({type?, contactId?, range?})` → SELECT z `unified_meetings` + `meeting_participants` (dla group) + `consultations.contact_id` join (dla consultation).
  - `useUnifiedMeeting(id, source)` → routuje do właściwej tabeli.
- **Nowa strona `src/pages/Meetings.tsx`** (rename istniejącej do `MeetingsLegacy.tsx` na 30 dni? — **nie, prostszą drogą**: zostawiam istniejącą `Meetings.tsx` (group_meetings), dodaję **zakładki** w niej:
  - „Wszystkie / Konsultacje / Grupowe" — filtr napędzany `useUnifiedMeetings`.
  - „Konsultacje" → klik nawigation `/consultations/:id` (istniejąca trasa).
  - „Grupowe" → klik `/meetings/:id` (istniejąca, na `group_meetings`).
- **`src/components/contacts/MeetingsTab.tsx`**: dodaję zakładkę „Wszystkie spotkania" (lista z `useUnifiedMeetings({contactId})`) obok istniejących Konsultacje/BI/GCal. Bez zmiany istniejących.

#### C. Sovra
- **`sovra/tools.ts`** — nowy tool `search_meetings({type?, contact_id?, date_from?, date_to?, limit?})` (read-only, no confirmation):
  - Handler: SELECT z `unified_meetings` + filtry → zwraca `[{id, type, scheduled_at, location, notes_excerpt, contact_name, source_table}]`.
  - `human_summary`: „Znalazłem N spotkań (X konsultacje, Y grupowe)".
- **NIE** zmieniam `create_meeting` w tym sprincie (istniejący tool tworzy `group_meetings`; tworzenie `consultations` przez Sovrę wymaga osobnego tool `create_consultation` — out of scope, można dodać później jeśli Remek zażąda).

#### D. Co odkładam do osobnego sprintu (deprecation, 30+ dni później)
- Fizyczne scalenie do jednej tabeli `meetings`.
- Migracja child tables konsultacji (questionnaire/thanks/recommendations) do JSONB `metadata`.
- Migracja `tasks.consultation_id` → `tasks.meeting_id`.
- RENAME starych tabel na `deprecated_*`.
- Usunięcie tras `/consultations/:id`.
- ADR `docs/adr/0018-meetings-unification.md` — zapis dlaczego rozłożone na 2 sprinty.

#### E. Memory
- Nowy `mem://features/meetings/unified-view` — opisuje view, hook, zakres scalenia FE-only w S18, plan fizycznego scalenia w późniejszym sprincie.
- Update `mem://index.md`.

### F. Kolejność
1. Migracja SQL (4 snapshoty + view).
2. `useUnifiedMeetings.ts` hook.
3. Tabs w `Meetings.tsx` + nowy filtr.
4. Zakładka „Wszystkie spotkania" w `ContactDetail.MeetingsTab`.
5. Sovra `search_meetings` tool.
6. Memory + ADR.

### G. DoD
- [ ] 4 snapshoty w `archive.*_backup_20260419`.
- [ ] `unified_meetings` view zwraca konsultacje + group_meetings z poprawnym tenant filteringiem (RLS via `security_invoker`).
- [ ] `/meetings` ma zakładki Wszystkie/Konsultacje/Grupowe.
- [ ] Tab „Wszystkie spotkania" na karcie kontaktu.
- [ ] Sovra `search_meetings` zwraca realne wyniki cross-table.
- [ ] ADR zapisany.

### H. Ryzyka
- **R1 (główne)** — MD zakładał big-bang, my nie. Remek może oczekiwać pełnego scalenia. Mitygacja: ADR + jasna deklaracja w changelog.
- **R2** `unified_meetings` view performance przy dużych wolumenach — obecnie 3 wiersze, irrelevant. Indeksy źródłowe istnieją.
- **R3** `security_invoker=true` na view — Postgres ≥15. Jeśli wersja niższa: fallback na SECURITY DEFINER funkcję `rpc_unified_meetings(p_type?, p_contact_id?)`. Sprawdzę przy migracji.
- **R4** Konflikt nazwy hook `useMeetings` vs `useUnifiedMeetings` — rozdzielam świadomie; nie ruszam istniejącego.

