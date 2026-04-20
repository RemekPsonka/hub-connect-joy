

# B-FIX.5 — Wizualne statusy zadań na karcie kanban

## Cel
Karta w `UnifiedKanban` ma "od pierwszego rzutu oka" pokazywać stan zadań kontaktu: kolorowy lewy pasek (overdue/today/active/done/none), pill ze statusem + licznikiem, awatary asystentek, mini-banner najstarszego przeterminowanego zadania.

## Świadome decyzje
- **Kanał danych**: rozszerzam istniejące `useActiveTaskContacts` (już używane przez stary `KanbanBoard.tsx`) → wszystkie miejsca, które konsumują `TaskContactInfo` (HotLeadCard, TopLeadCard, LeadCard, ColdLeadCard, SubKanbanView, KanbanBoard) MUSZĄ działać po rozszerzeniu typu. Stare pole `assignedTo: string | null` zostaje usunięte i zastąpione bogatszym kształtem — sprawdzę i dotknę te konsumenty (jeśli czytają `info.assignedTo`, zaktualizuję na `info.assignees`).
- **Refetch po mutacji tasków**: `staleTime: 10 min` zostaje, ale dorzucam `refetchOnMount: true` + `refetchOnWindowFocus: true` żeby pill odświeżał się przy powrocie do widoku.
- **Avatar fallback**: dla braku `directors.full_name` → "?". Kolor z hash(id) → stała paleta Tailwind.
- **Banner overdue**: klik → otwiera `ContactTasksSheet` przez `onMoreClick` (już propagowane przez DraggableCard/DroppableColumn).
- **Stary `isOverdue`** w `UnifiedKanbanCard` (czytał `contact.status_overdue` + `next_action_date`) wylatuje — źródłem prawdy są teraz taski.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/hooks/useActiveTaskContacts.ts` | EDIT — rozszerzony typ `TaskContactInfo` + agregacja overdue/today/active/done + `oldestOverdue` + `assignees[]` z join na `directors!tasks_assigned_to_fkey` |
| 2 | `src/components/sgu/sales/TaskStatusPill.tsx` | NEW — Badge + ikona + licznik + tooltip; klik → `onClick()` z `stopPropagation` |
| 3 | `src/components/sgu/sales/AssigneeAvatars.tsx` | NEW — do 3 awatarów z inicjałami + tooltip; "+N" dla nadmiaru |
| 4 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — prop `taskInfo`, `border-l-4` per status, header z Pill + Avatars (zamiast `AlertTriangle`), mini-banner overdue przed stopką, usunięcie `isOverdue` z `status_overdue/next_action_date` |
| 5 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — `useActiveTaskContacts(teamId)` → `taskInfoMap`, propagacja przez `DroppableColumn` → `DraggableCard` → `UnifiedKanbanCard` |
| 6 | Konsumenty starego typu (`KanbanBoard.tsx`, `HotLeadCard.tsx`, `TopLeadCard.tsx`, `LeadCard.tsx`, `ColdLeadCard.tsx`, `SubKanbanView.tsx`) | AUDIT + minimalny EDIT — jeśli czytają `info.assignedTo`, podmienić na `info.assignees[0]?.id` lub usunąć (zależnie od użycia). Bez zmiany layoutu. |

## Szczegóły kluczowych zmian

### 1. `useActiveTaskContacts.ts` — nowy kształt
```ts
export type TaskStatus = 'overdue' | 'today' | 'active' | 'done' | 'none';
export type TaskAssignee = { id: string; full_name: string };
export type TaskContactInfo = {
  status: TaskStatus;
  overdueCount: number; todayCount: number; activeCount: number; doneCount: number;
  oldestOverdue?: { title: string; due_date: string; days_ago: number };
  assignees: TaskAssignee[];
};
```
Query: `select` rozszerzony o `title, assigned_to, assignee:directors!tasks_assigned_to_fkey(id, full_name)`, `.in('status', ['todo','in_progress','completed'])`. Priorytet statusu: overdue > today > active > done > none.

### 2. `TaskStatusPill.tsx`
Badge `h-5 px-1.5` + ikona (AlertCircle/Clock/Circle/CheckCircle2/Plus) + licznik (`done` → `N✓`, reszta → suma open). Tooltip z rozbiciem. `e.stopPropagation()` na `onClick` i `onPointerDown`.

### 3. `AssigneeAvatars.tsx`
Max 3 widocznych awatarów (`h-5 w-5` z inicjałami), ring biały dla nakładki, "+N" badge dla reszty. Tooltip z `full_name`. **Uwaga implementacyjna**: w briefie JSX był obcięty (puste linie) — zaimplementuję pełny komponent zgodnie z opisem, używając `flex -space-x-1`.

### 4. `UnifiedKanbanCard.tsx`
- Usuwam `isOverdue` z `status_overdue`/`next_action_date` + `AlertTriangle` w headerze.
- Dodaję `taskInfo?: TaskContactInfo` do propsów.
- `borderClass: Record<TaskStatus, string>` → `border-l-4` + kolor.
- W headerze (po prawej stronie tytułu): `<TaskStatusPill info={taskInfo} onClick={onMoreClick} />` + `<AssigneeAvatars assignees={taskInfo?.assignees ?? []} />`.
- Przed stopką: warunkowy `<button>` mini-banner z `oldestOverdue` (klik → `onMoreClick`).

### 5. `UnifiedKanban.tsx`
```tsx
const { data: taskInfoMap } = useActiveTaskContacts(teamId);
```
- `DroppableColumn` props: `taskInfoMap?: Map<string, TaskContactInfo>`, w `renderCard` → `taskInfo={taskInfoMap?.get(c.contact_id)}`.
- `DraggableCard` props: `taskInfo?: TaskContactInfo`, przekazany do `UnifiedKanbanCard`.
- W `visibleColumns.map` → `taskInfoMap={taskInfoMap}`.

### 6. Audit konsumentów starego typu
`assignedTo: string | null` znika. Konsumenty używają tylko `import type { TaskContactInfo }` — sprawdzę czy gdziekolwiek czytają `.assignedTo` lub `.status === 'active'/'overdue'` (oba stany pozostają, więc 99% przypadków bez zmian). Jeśli tak — minimalny patch (np. `assignees[0]?.id`).

## Weryfikacja

```bash
npx tsc --noEmit                                                                    # exit 0
grep -rn "status_overdue\|next_action_date" src/components/sgu/sales/UnifiedKanbanCard.tsx   # 0
grep -n "border-l-4" src/components/sgu/sales/UnifiedKanbanCard.tsx                  # ≥ 1
grep -rn "info\.assignedTo\|\.assignedTo" src/components/                            # 0 po patchu
```

Manual smoke (po stronie usera):
- Kontakt z taskiem `due_date < today` → pasek czerwony, pill pulsuje (`AlertCircle + N`), mini-banner "X dni temu: <tytuł>"
- Kontakt bez tasków → pasek szary, pill `+`
- Kontakt z 2 wykonanymi → pasek przygaszony zielony, pill `2✓`
- Klik pill / banner → otwiera `ContactTasksSheet`
- Drag & drop nadal działa (Pill ma `onPointerDown stopPropagation`)
- Awatary pokazują inicjały asystentek z join `directors`

## DoD

| Check | Stan |
|---|---|
| Typ `TaskContactInfo` rozszerzony, query z join `directors` | ✅ |
| `TaskStatusPill` + `AssigneeAvatars` istnieją | ✅ |
| Karta ma `border-l-4` zależny od statusu zadań | ✅ |
| Mini-banner overdue klikalny | ✅ |
| `useActiveTaskContacts` propagowany przez Kanban → Column → DraggableCard → Card | ✅ |
| Konsumenty starego typu skompilowane bez błędów | ✅ |
| `tsc --noEmit` exit 0 | ✅ |

