

# B-FIX.4 — Badge "Więcej" → ContactTasksSheet w UnifiedKanban

## Cel
Dodać do każdej karty w `UnifiedKanban` przycisk "Więcej", który otwiera reusowalny `ContactTasksSheet` (boczny panel z pełnymi danymi kontaktu, taskami i quick actions). Reuse 1:1 — bez modyfikacji `ContactTasksSheet.tsx`.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — prop `onMoreClick`, button "Więcej" w stopce |
| 2 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — stan `sheetContact`, render `<ContactTasksSheet>`, prop drilling |

## Szczegóły

### 1. `UnifiedKanbanCard.tsx`
- Dodać `onMoreClick: () => void` do `UnifiedKanbanCardProps`
- Import `MoreHorizontal` z `lucide-react`
- W stopce (`<div className="pt-1 border-t flex justify-end" ...>`) **na lewo** od buttona "Oznacz jako lost" wstawić:
  ```tsx
  <Button
    variant="outline"
    size="sm"
    className="h-6 px-2 text-[10px] gap-1 mr-auto"
    onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
  >
    <MoreHorizontal className="h-3 w-3" />
    Więcej
  </Button>
  ```
- Klik karty (poza badgem/buttonem) bez zmian → nawigacja do `/sgu/klienci?contactId=...`

### 2. `UnifiedKanban.tsx`
- Import: `import { ContactTasksSheet } from '@/components/deals-team/ContactTasksSheet';`
- Stan: `const [sheetContact, setSheetContact] = useState<DealTeamContact | null>(null);`
- Rozszerzyć propsy `DraggableCard` i `DroppableColumn` o `onMoreClick: (c: DealTeamContact) => void`
- Prop drilling: `UnifiedKanban` → `DroppableColumn` (`onMoreClick={onMoreClick}`) → `DraggableCard` (`onMoreClick={() => onMoreClick(contact)}`) → `UnifiedKanbanCard` (`onMoreClick={onMoreClick}`)
- W `UnifiedKanban` przekazać `onMoreClick={(c) => setSheetContact(c)}` do każdego `DroppableColumn`
- Pod `<DndContext>` (obok istniejących dialogów Convert/Lost) dorenderować:
  ```tsx
  <ContactTasksSheet
    contact={sheetContact}
    teamId={teamId}
    open={sheetContact !== null}
    onOpenChange={(open) => !open && setSheetContact(null)}
  />
  ```

### 3. Drag & drop hardening
Button ma już `onClick` z `e.stopPropagation()`. dnd-kit nasłuchuje na `onPointerDown` z `useDraggable.listeners`. Jeśli klik buttona zostałby przechwycony przez sensor (PointerSensor ma `activationConstraint.distance: 6` — kliknięcie bez ruchu nie aktywuje draggu, więc powinno działać). Jeśli w testach okaże się problem → dodać `onPointerDown={(e) => e.stopPropagation()}` na buttonie. W planie: zostawiamy tylko `onClick stopPropagation` zgodnie z briefem; wariant `onPointerDown` trzymamy w odwodzie.

## Świadome decyzje
1. **Brak modyfikacji `ContactTasksSheet`** — komponent już akceptuje `contact: DealTeamContact | null` + `teamId` + `open/onOpenChange`. Reuse 1:1.
2. **Pojedynczy stan `sheetContact`** w `UnifiedKanban` — nie per-column. Tylko jeden Sheet otwarty naraz.
3. **`mr-auto`** na buttonie "Więcej" — wypycha go do lewej, zachowując "Oznacz jako lost" po prawej (stopka używa `flex justify-end`).
4. **Bez zmian w hookach** — `ContactTasksSheet` sam używa `useCreateTask`, `useUpdateTeamContact` itd.

## Weryfikacja

```bash
grep -n "Więcej" src/components/sgu/sales/UnifiedKanbanCard.tsx   # 1 wynik
npx tsc --noEmit                                                   # exit 0
```

Manual smoke (po stronie usera, nie smokuję sam zgodnie z konwencją):
- Każda karta ma badge "Więcej" w stopce (po lewej)
- Klik "Więcej" → otwiera Sheet z prawej; klik karty (poza buttonami/badge) → nadal nawigacja do `/sgu/klienci?contactId=...`
- Quick actions w Sheet (Umów spotkanie / Zadzwoń / Wyślij ofertę / Wyślij mail) tworzą task widoczny w liście
- "Umów spotkanie" na kontakcie `category=hot|top` → auto `offering_stage='meeting_plan'`
- Drag & drop dalej działa

## DoD

| Check | Stan |
|---|---|
| Każda karta ma button "Więcej" | ✅ |
| Klik "Więcej" otwiera `ContactTasksSheet` | ✅ |
| Klik karty nadal nawiguje | ✅ |
| Drag & drop działa | ✅ |
| `ContactTasksSheet` niezmodyfikowany | ✅ |
| `tsc --noEmit` exit 0 | ✅ |

