

# Naprawa bledu w Kanban Drag & Drop

## Problem

Blad wynika z konfliktu miedzy drag & drop a kliknieciem karty:
1. Po zakonczeniu przeciagania (drop/dragEnd) zdarzenie `click` rowniez sie odpala na karcie, co otwiera popup `DealContactDetailSheet` jednoczesnie z aktualizacja kategorii -- powodujac niespodziewane zachowanie i potencjalny crash.
2. W `HotLeadCard` checkbox do zadac nie ma `onClick` ze `stopPropagation`, wiec klikniecie w checkbox rowniez otwiera popup.

## Rozwiazanie

### 1. Blokowanie click po drag (wszystkie karty)

Dodanie logiki `wasDragging` ref w `KanbanBoard` ktora blokuje `onClick` jesli wlasnie zakonczono przeciaganie:

```text
KanbanBoard:
  - wasDraggingRef = useRef(false)
  - handleDragStart: wasDraggingRef.current = true
  - handleDragEnd: setTimeout(() => wasDraggingRef.current = false, 0)
  - handleCardClick(contact): if (wasDraggingRef.current) return; setSelectedContact(contact)
```

### 2. stopPropagation na Checkbox w HotLeadCard

Dodanie `onClick={(e) => e.stopPropagation()}` na kazdym `Checkbox` w `HotLeadCard` aby klikniecie w checkbox nie otwieralo popupu.

### 3. Zabezpieczenie priorityColors przed null

W `TopLeadCard`, `LeadCard`, `ColdLeadCard` -- dodanie fallbacku gdy `contact.priority` jest null/undefined:

```text
priorityColors[contact.priority] || ''
```

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/KanbanBoard.tsx` | Dodanie `wasDraggingRef` + `handleCardClick` z zabezpieczeniem, przekazanie do kart |
| `src/components/deals-team/HotLeadCard.tsx` | Dodanie `onClick={e => e.stopPropagation()}` na Checkbox |
| `src/components/deals-team/TopLeadCard.tsx` | Fallback dla `priorityColors` |
| `src/components/deals-team/LeadCard.tsx` | Fallback dla `priorityColors` |
| `src/components/deals-team/ColdLeadCard.tsx` | Fallback dla `priorityColors` |

## Szczegoly techniczne

W `KanbanBoard.tsx`:
- Nowy `useRef`: `const wasDraggingRef = useRef(false);`
- W `handleDragStart`: `wasDraggingRef.current = true;`
- W `handleDragEnd`: `setTimeout(() => { wasDraggingRef.current = false; }, 0);` (setTimeout zapewnia ze click event zdazy sie odpalic zanim flaga zostanie zresetowana)
- Nowa funkcja `handleCardClick(contact)`: sprawdza `wasDraggingRef.current` -- jesli true, return; w przeciwnym razie `setSelectedContact(contact)`
- Zamiana `onClick={() => setSelectedContact(contact)}` na `onClick={() => handleCardClick(contact)}` we wszystkich kartach

