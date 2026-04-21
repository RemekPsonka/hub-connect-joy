

# B-FIX.5-overflow — Wyrwanie kart z ScrollArea i defensywny truncate na bannerach

## Diagnoza

Karty Lead/Klient nadal rozpychają kolumnę poziomo, mimo `min-w-0 overflow-hidden` na wrapperach. Root cause: **Radix `ScrollArea`** (linia 266) wewnętrznie renderuje `<ScrollAreaPrimitive.Viewport>` z `display: table; min-width: 100%`. Element `table` ignoruje `min-w-0` rodzica i rozszerza się do szerokości najszerszego dziecka — w tym przypadku `<button class="w-full ... truncate">` z długim tekstem („Dziś: Zadzwonić do Artur Czepczyński"). To omija `overflow-hidden` na samej kolumnie, bo ScrollArea-viewport pozwala na poziome wylewanie zawartości w górę drzewa.

Dodatkowo: `<button>` w trybie flex/grid ma w niektórych silnikach domyślne `min-inline-size: min-content`, więc samo `truncate` na buttonie potrafi nie zadziałać bez `min-w-0` + wewnętrznego `<span class="truncate">`.

## Rozwiązanie

### 1. `UnifiedKanban.tsx` — zastąpić `ScrollArea` natywnym scrollem
Plik: `src/components/sgu/sales/UnifiedKanban.tsx`

- Usunąć import `ScrollArea` z `@/components/ui/scroll-area` (linia 12) — nie jest używany nigdzie indziej w tym pliku.
- Zastąpić blok (linie 266–268):

```tsx
<ScrollArea className="flex-1 p-2 min-w-0">
  <div className="min-w-0">{body}</div>
</ScrollArea>
```

na:

```tsx
<div className="flex-1 p-2 min-w-0 overflow-y-auto overflow-x-hidden">
  <div className="min-w-0">{body}</div>
</div>
```

Efekt: pionowy scroll działa jak dotąd; poziomy scroll/wylewanie jest twardo klipowane przez `overflow-x-hidden` bez wewnętrznego table-wrappera Radix.

### 2. `UnifiedKanbanCard.tsx` — defensywny `min-w-0` + span-truncate na bannerach
Plik: `src/components/sgu/sales/UnifiedKanbanCard.tsx`

Trzy `<button>` mini-bannera (overdue / next / placeholder) — w każdym:

- Na `<button>`: usunąć klasę `truncate`, dodać `min-w-0 block overflow-hidden` (zachować pozostałe klasy, w tym dynamiczne `cn(...)` dla wariantu next).
- Tekst opakować w `<span className="block truncate">…</span>`.

Przykład (overdue):

```tsx
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); onMoreClick(); }}
  onPointerDown={(e) => e.stopPropagation()}
  className="w-full min-w-0 block text-left text-[10px] px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition overflow-hidden"
>
  <span className="block truncate">
    {taskInfo.oldestOverdue.days_ago === 0
      ? `Dziś: ${taskInfo.oldestOverdue.title}`
      : `${taskInfo.oldestOverdue.days_ago} dni temu: ${taskInfo.oldestOverdue.title}`}
  </span>
</button>
```

Analogicznie dla wariantu `nextTask` (zachować dynamiczny `cn(...)` z amber/emerald) i placeholdera „+ Zaplanuj następne zadanie".

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — usunąć import `ScrollArea`, zastąpić `<ScrollArea>` natywnym `<div overflow-y-auto overflow-x-hidden>` |
| 2 | `src/components/sgu/sales/UnifiedKanbanCard.tsx` | EDIT — w 3 buttonach mini-bannera: `min-w-0 block overflow-hidden` na buttonie + `<span class="block truncate">` na tekście |

## DoD

| Check | Stan |
|---|---|
| Banner „Dziś: Zadzwonić do Artur Czepczyński" w Lead obcięty elipsą w granicach kolumny | ✅ |
| Bannery overdue w Ofertowanie obcięte do szerokości kolumny | ✅ |
| Pionowy scroll w kolumnach nadal działa | ✅ |
| DnD między kolumnami nadal działa | ✅ |
| Żadna kolumna nie wystaje poziomo poza grid | ✅ |
| `npx tsc --noEmit` exit 0 | ✅ |

