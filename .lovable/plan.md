

# B-FIX.5-owner — Avatar opiekuna kontaktu zawsze widoczny na karcie kanban

## Diagnoza

`deal_team_contacts.assigned_to` (uuid → `directors.id`) trzyma opiekuna kontaktu, ale na kartach Kanbana nie pokazujemy go. Slot „opiekun" w prawym górnym rogu pokazuje wyłącznie assignees zadania (`taskInfo.assignees`). Gdy kontakt nie ma żadnego aktywnego zadania (Lead/Klient bez zadań), karta wygląda jak „bez opiekuna" — choć rzeczywisty opiekun istnieje.

Stan obecny:
- `deal_team_contacts.assigned_to` → `uuid`, brak FK (potwierdzone w DB).
- W typie `DealTeamContact` jest już prefigurowany `assigned_director?: { id, full_name }`, ale nie jest pobierany.
- `useTeamContacts` robi `select('*')` bez joinu.
- `AssigneeAvatars` przyjmuje tylko `assignees: TaskAssignee[]`.

## Rozwiązanie

### 1. Migracja: FK `deal_team_contacts.assigned_to → directors(id)`
Plik: `supabase/migrations/<ts>_deal_team_contacts_assigned_to_fk.sql`

- Dodać brakujący FK z `ON DELETE SET NULL`.
- Dodać indeks na `assigned_to` (nie istnieje, a jest filtrowany w wielu miejscach).
- ROLLBACK w komentarzu.

```sql
ALTER TABLE public.deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.directors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deal_team_contacts_assigned_to
  ON public.deal_team_contacts(assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ROLLBACK:
-- DROP INDEX IF EXISTS public.idx_deal_team_contacts_assigned_to;
-- ALTER TABLE public.deal_team_contacts DROP CONSTRAINT IF EXISTS deal_team_contacts_assigned_to_fkey;
```

### 2. `useDealsTeamContacts.ts` — dociągnąć opiekuna
Plik: `src/hooks/useDealsTeamContacts.ts`

- W `useTeamContacts`: zostawić obecny kształt zapytania, ale po pobraniu `dealContacts` dociągnąć batch `directors(id, full_name)` po unikalnych `assigned_to` (tak samo jak robimy z `companies` — bez join-stringa, prościej i bez ryzyka relacji w PostgREST).
- Zmapować na każdy `dc` pole `assigned_director: { id, full_name } | null`.
- Analogicznie w `useTeamContact` (single).

Powód doboru tej drogi (zamiast `select(',owner:directors!fk(...)')`): istniejący kod świadomie unika joinów PostgREST i robi mapy w JS — będzie spójnie i nie ryzykujemy konfliktów z RLS na `directors`.

### 3. Typ — bez zmian
Plik: `src/types/dealTeam.ts`

`DealTeamContact.assigned_director?: { id; full_name }` już istnieje (linie 166–169). Wystarczy go faktycznie wypełniać. Brief proponował `owner` — używamy istniejącego `assigned_director`, by nie mnożyć pól.

### 4. `AssigneeAvatars` — nowy prop `owner`
Plik: `src/components/sgu/sales/AssigneeAvatars.tsx`

- Dodać prop `owner?: { id; full_name } | null`.
- Zbudować lokalną listę `items`: najpierw `owner` (jeśli jest), potem `assignees` z deduplikacją po `id`.
- Placeholder „+" pokazujemy tylko gdy `items.length === 0` (tak jak dziś, ale na połączonej liście).
- `visible = items.slice(0, 3)`, `extra = items.length - visible.length`. Pierwszy avatar (opiekun) dostaje cienką ramkę-akcent (`ring-primary/40`) żeby wizualnie odróżnić go od assignees zadania. Tooltip opiekuna: `"Opiekun: <full_name>"`.

### 5. `UnifiedKanbanCard` — przekazać `owner`
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

```tsx
<AssigneeAvatars
  owner={contact.assigned_director ?? null}
  assignees={taskInfo?.assignees ?? []}
  onAddClick={onMoreClick}
/>
```

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `supabase/migrations/<ts>_deal_team_contacts_assigned_to_fk.sql` | NEW — FK + indeks + rollback |
| 2 | `src/hooks/useDealsTeamContacts.ts` | EDIT — dociągnięcie `directors` po `assigned_to` w `useTeamContacts` i `useTeamContact`, mapowanie na `assigned_director` |
| 3 | `src/components/sgu/sales/AssigneeAvatars.tsx` | EDIT — nowy prop `owner`, scalenie z `assignees`, dedupe, akcent na pierwszym avatarze |
| 4 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — przekazać `contact.assigned_director` do `AssigneeAvatars` |

## DoD

| Check | Stan |
|---|---|
| Migracja FK + indeks zadeployowana, rollback udokumentowany | ✅ |
| Kontakt z `assigned_to` ustawionym → avatar opiekuna widoczny w Lead/Prospekt/Klient/Ofertowanie nawet bez tasków | ✅ |
| Tooltip opiekuna: „Opiekun: <Imię Nazwisko>" | ✅ |
| Opiekun + assignee tego samego doradcy → jeden avatar (dedupe) | ✅ |
| Opiekun + assignee innego doradcy → dwa avatary, opiekun pierwszy z subtelnym akcentem | ✅ |
| Bez opiekuna i bez assignee → istniejący placeholder „+" bez zmian | ✅ |
| `npx tsc --noEmit` exit 0 | ✅ |

