

# B-FIX.6 — Motywacja: „Od ostatniej odprawy" (snapshot + streak + confetti + filtr moje overdue)

## Co dostarczamy

W `UnifiedKanban` na `/sgu/sprzedaz` pojawia się rytuał cotygodniowej odprawy:

1. **Przycisk „Zapisz odprawę"** zamraża snapshot wszystkich otwartych tasków (todo/in_progress/pending) zespołu.
2. **Pasek progressu** „Od ostatniej odprawy" — globalnie + mini-pasek w nagłówku każdej kolumny.
3. **Streak** „N tygodni z rzędu 100%" jeśli kolejne odprawy zamykały 100% snapshotu.
4. **Confetti + toast** gdy liczba overdue spadnie z >0 do 0.
5. **Toggle „Moje overdue"** w toolbarze — filtruje kontakty do tych z overdue przypisanymi do zalogowanego dyrektora.

Logika snapshot: po kliknięciu „Zapisz odprawę" zamrażamy listę otwartych tasków. Licznik „done" rośnie tylko wśród nich. Nowe taski dodane po odprawie nie wpadają do bieżącego okresu — wpadną do snapshotu kolejnej odprawy.

## Kontekst implementacyjny (poprawki względem briefu)

- **Taski nie są osadzone w `DealTeamContact`** — ładuje je `useActiveTaskContacts(teamId)` osobnym zapytaniem. Snapshot budujemy z surowego query do `tasks` (po `deal_team_id = teamId`, status in `('todo','pending','in_progress')`), nie z `c.tasks`.
- **`assigned_to` w `tasks` to `director_id`** — filtr „moje overdue" porównuje do `useCurrentDirector().data.id`, nie do `auth.uid()`.
- **`overdueCount` dla confetti** wyliczamy z istniejącego `taskInfoMap` (`Σ info.overdueCount`), bez dodatkowego query.
- **Schema FK**: `team_meetings.created_by` → `directors(id)` (brak tabeli `users` w schemacie biznesowym), tenant z `deal_teams.tenant_id`.

## Zmiany w bazie

Nowa migracja `supabase/migrations/<timestamp>_team_meetings.sql`:

- `public.team_meetings` (id, team_id FK `deal_teams`, tenant_id FK `tenants`, meeting_at, created_by FK `directors`, notes, created_at) + index `(team_id, meeting_at DESC)`.
- `public.team_meeting_task_snapshot` (id, meeting_id FK, task_id FK `tasks`, team_contact_id FK `deal_team_contacts`, column_key text, task_status_at_snapshot text, UNIQUE(meeting_id, task_id)).
- RLS `SELECT` na obu tabelach przez `is_deal_team_member(team_id)`. Brak policy INSERT — wkład tylko przez RPC.
- RPC `create_team_meeting(p_team_id, p_notes, p_snapshot jsonb)` — `SECURITY DEFINER`, sprawdza `is_deal_team_member`, wstawia odprawę i bulk-insert snapshotu z JSONB array, zwraca `meeting_id`.
- RPC `get_team_meeting_streak(p_team_id)` — iteruje odprawy desc, liczy ile **poprzednich** miało 100% snapshotu zamkniętego przed kolejną odprawą; przerywa przy >14 dni odstępu lub niezamkniętym snapshot.
- Rollback w komentarzu (`-- ROLLBACK:` z `DROP FUNCTION ... ; DROP TABLE ...`).

Po migracji typy Supabase regenerują się automatycznie.

## Frontend — nowe pliki

| Plik | Co robi |
|---|---|
| `src/hooks/useTeamMeetings.ts` | `useLastTeamMeeting`, `useMeetingProgress`, `useSaveTeamMeeting` (mutacja → `rpc('create_team_meeting')`), `useTeamMeetingStreak` (rpc), `useTeamMeetingsHistory` |
| `src/components/sgu/sales/SaveMeetingDialog.tsx` | Dialog z `Textarea` na notatki + przycisk „Zapisz odprawę"; pokazuje liczbę tasków do zamrożenia |
| `src/components/sgu/sales/MeetingProgressBar.tsx` | Globalny pasek: ikona Users + „Od ostatniej odprawy (X temu)" + `done/total (%)`, `Progress`, badge streak (Flame), badge ✨ przy 100%, przycisk „Zapisz odprawę (N)" |

`useMeetingProgress` pobiera `team_meeting_task_snapshot` z embed `tasks!inner(status)` po `meeting_id`, agreguje globalnie i per `column_key`.

## Frontend — zmiany w istniejących plikach

### `src/components/sgu/sales/UnifiedKanban.tsx`

- Importy: `useCurrentDirector`, `useLastTeamMeeting`, `useMeetingProgress`, `useSaveTeamMeeting`, `useTeamMeetingStreak`, `MeetingProgressBar`, `SaveMeetingDialog`, `Toggle`, `AlertCircle`, `confetti`.
- Stan: `showMeetingDialog`, `myOverdueOnly`, `prevOverdueCountRef`.
- Snapshot otwartych tasków: nowy hook lokalny **lub** osobny `useOpenTasksSnapshot(teamId)` — query do `tasks` (`select id, status, deal_team_contact_id`, filtr po `deal_team_id`, status in `('todo','pending','in_progress')`, `deal_team_contact_id not null`). Przed wysyłką mapujemy `column_key = deriveStage(contact)` używając mapy `contactById` z `useTeamContacts`.
- `MeetingProgressBar` renderowany pod toolbarem, nad `DndContext`.
- `SaveMeetingDialog` na końcu drzewa; `onConfirm` woła `useSaveTeamMeeting.mutateAsync({ teamId, notes, snapshot })`.
- Confetti: `overdueCount = Σ taskInfoMap.values().overdueCount`, `useEffect` porównuje z `prevOverdueCountRef.current`; przejście `>0 → 0` → `confetti(...) + toast.success(...)`.
- Filtr „Moje overdue": w `visible` (po wyszukiwaniu) dokładamy filtr — kontakt musi mieć w `taskInfoMap.get(c.id).assignees` `currentDirector.id` oraz `overdueCount > 0`. Toggle dodany w toolbarze obok checkboxa „Grupuj wg sub-kategorii".

### `src/components/sgu/sales/UnifiedKanban.tsx` — nagłówek kolumny

Tam, gdzie `DroppableColumn` renderuje header kolumny, dorzucamy mini-pasek `progress.by_column[col.stage]` (jeśli `total > 0`):

```text
Od odprawy   3/8
[████░░░░░░]
```

Komponent inline w `DroppableColumn` lub mały sub-komponent `ColumnMeetingProgress`. Prop `columnProgress?: { total; done }` przekazany z `UnifiedKanban`.

## Zależności

- `npm i canvas-confetti @types/canvas-confetti` — używany tylko w `UnifiedKanban`.

## Pliki — podsumowanie

| # | Plik | Akcja |
|---|---|---|
| 1 | `supabase/migrations/<ts>_team_meetings.sql` | NEW — 2 tabele, 2 RPC, RLS, rollback |
| 2 | `src/hooks/useTeamMeetings.ts` | NEW — 5 hooków |
| 3 | `src/components/sgu/sales/SaveMeetingDialog.tsx` | NEW |
| 4 | `src/components/sgu/sales/MeetingProgressBar.tsx` | NEW |
| 5 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — pasek, dialog, confetti, toggle, mini-paski w kolumnach |
| 6 | `package.json` | EDIT — `canvas-confetti` |

## Poza zakresem

- Strona historii odpraw, eksport PDF, push/email „minął tydzień".
- Streak per indywidualny director (tylko team-level w MVP).
- Ręczna edycja/usuwanie odprawy (na razie tylko create + read).

## DoD

| Check | Stan |
|---|---|
| Migracja przechodzi; tabele i RPC widoczne w schemacie | ⬜ |
| „Zapisz odprawę" tworzy `team_meetings` + N rekordów snapshotu | ⬜ |
| Pasek pokazuje `done/total` rosnące tylko po zamknięciu tasków ze snapshotu | ⬜ |
| Nowy task po odprawie NIE wpływa na bieżący `total` | ⬜ |
| Mini-pasek w każdej kolumnie z `total > 0` | ⬜ |
| Streak = N po N kolejnych 100%-owych odprawach (≤14 dni odstęp) | ⬜ |
| Confetti przy przejściu overdue >0 → 0 | ⬜ |
| Toggle „Moje overdue" filtruje po `assignees` zalogowanego dyrektora | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

