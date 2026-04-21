

# B-FIX.5-overflow v2 — ScrollArea swap, defensywny truncate na bannerach, hotfix `pending`

## Diagnoza

Trzy niezależne rzeczy w jednym sprincie:

1. **Kolumny kanbana nadal rosną poziomo** — Radix `ScrollArea` Viewport dodaje wewnętrznie `display:table; min-width:100%`, co omija `min-w-0` rodzica i pozwala dziecku z długim tekstem rozpychać kolumnę. Naprawione tylko częściowo w B-FIX.5-overflow (poprzedni sprint zamienił `<ScrollArea>` na `<div>`, ale wg user-briefu trzeba zweryfikować ostateczny render w `DroppableColumn` i finalnie usunąć import).
2. **Buttony mini-bannera** mogą nie obcinać tekstu w kontekście flex/grid bez `min-w-0` na buttonie + `<span class="block truncate">` na tekście (poprzedni sprint to wprowadził, ale brief v2 chce potwierdzić wszystkie 3 buttony pod jeden wzorzec).
3. **Hotfix dla `useActiveTaskContacts`** — w repo współistnieją dwie konwencje statusu zadania: `'todo'` (w `useTasks`, `ContactTasksSheet`) i `'pending'` (w `AddClientTaskDialog`, `ClientRenewalsTab`, `ClientComplexityPanel`, `useSovraDebrief`). Hook filtruje tylko `['todo','in_progress','completed']`, więc kontakty z zadaniami dodanymi z dialogów `pending` nie pokazują:
   - `TaskStatusPill` (bo brak rekordów),
   - bannera overdue,
   - awatarów assignee z zadań,
   - banneru next-task.

To wyjaśnia, czemu Lead/Klient po B-FIX.16 nadal wyglądają jak „puste" mimo dodanych zadań z UI.

## Rozwiązanie

### 1. `UnifiedKanban.tsx` — finalnie wyrwać `ScrollArea`
Plik: `src/components/sgu/sales/UnifiedKanban.tsx`

- Zweryfikować, że `<ScrollArea>` nie jest już używany w `DroppableColumn` (po B-FIX.5-overflow powinien być natywny `<div className="flex-1 p-2 min-w-0 overflow-y-auto overflow-x-hidden">`).
- Jeśli jeszcze gdziekolwiek pozostał `ScrollArea` — wymienić na ten sam wzorzec.
- Usunąć import `import { ScrollArea } from '@/components/ui/scroll-area';` jeśli nieużywany w pliku.

### 2. `UnifiedKanbanCard.tsx` — ujednolicić 3 buttony mini-bannera
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

Dla każdego z trzech buttonów (overdue / next / placeholder):
- W `className` buttona: usunąć ewentualne `truncate`, zapewnić `w-full min-w-0 block overflow-hidden`.
- Treść tekstową opakować w `<span className="block truncate">…</span>`.
- Zachować dynamiczny `cn(...)` z kolorami (amber/emerald) dla wariantu `nextTask`.
- Placeholder „+ Zaplanuj następne zadanie" — dla spójności także tekst w `<span class="block truncate">`.

(W bieżącym pliku po B-FIX.5-overflow wzorzec już jest zastosowany — krok służy weryfikacji i ewentualnym poprawkom, jeśli któryś button odbiega.)

### 3. `useActiveTaskContacts.ts` — uznać `pending` za otwarte zadanie
Plik: `src/hooks/useActiveTaskContacts.ts`

- Linia ~54 (`select(...).in('status', [...])`):
  ```ts
  .in('status', ['todo', 'pending', 'in_progress', 'completed'])
  ```
- Linia ~95 (`isOpen`):
  ```ts
  const isOpen = t.status === 'todo' || t.status === 'pending' || t.status === 'in_progress';
  ```

Reszta logiki (overdue / today / active / done, klasyfikacja typu, agregacja po kontakcie) pozostaje bez zmian — nowy status wpada do tej samej gałęzi `isOpen`, więc liczniki i bannery zaczną działać dla zadań `pending`.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — potwierdzić brak `<ScrollArea>` w `DroppableColumn`; usunąć nieużywany import |
| 2 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — ujednolicić 3 buttony mini-bannera (`min-w-0 block overflow-hidden` + `<span class="block truncate">`) |
| 3 | `src/hooks/useActiveTaskContacts.ts` | EDIT — dodać `'pending'` do filtru zapytania i do warunku `isOpen` |

## DoD

| Check | Stan |
|---|---|
| Żadna kolumna w `/sgu/sprzedaz` nie wystaje poziomo poza grid przy długich tytułach zadań | ✅ |
| Brak importu `ScrollArea` w `UnifiedKanban.tsx` | ✅ |
| 3 buttony mini-bannera obcinają tekst elipsą w granicach kolumny | ✅ |
| Karty kontaktów z zadaniami `pending` (dodanymi z `AddClientTaskDialog`, `ClientRenewalsTab`, `ClientComplexityPanel`, `useSovraDebrief`) pokazują `TaskStatusPill`, awatary assignees, banner overdue/next | ✅ |
| Karty z zadaniami `todo`/`in_progress` działają jak dotąd (brak regresji) | ✅ |
| Pionowy scroll i DnD między kolumnami nadal działają | ✅ |
| `npx tsc --noEmit` exit 0 | ✅ |

