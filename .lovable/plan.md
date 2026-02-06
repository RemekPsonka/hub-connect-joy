

# Implementacja Drag-and-Drop dla Deals Kanban

## Cel
Dodanie możliwości przeciągania deals między etapami pipeline przy użyciu biblioteki @dnd-kit/core.

## Analiza obecnego stanu

### Co już istnieje:
- `useMoveDeal` hook w `src/hooks/useDeals.ts` (linie 416-432) - aktualizuje `stage_id` deala
- `DealsKanban` - statyczny widok bez drag-and-drop
- `DealCard` - karta deala (wymaga dostosowania do drag-and-drop)

### Czego brakuje:
- Integracja z @dnd-kit/core (biblioteka już zainstalowana jako @dnd-kit - sprawdź package.json)
- Komponent `KanbanColumn` jako droppable zone
- Obsługa drag overlay dla płynnej animacji

## Zmiany do wprowadzenia

### 1. Sprawdzenie/instalacja zależności
Weryfikacja czy `@dnd-kit/core` jest zainstalowane. Jeśli nie - dodanie do projektu.

### 2. Nowy komponent `KanbanColumn.tsx`

```
src/components/deals/KanbanColumn.tsx
```

Komponent reprezentujący kolumnę Kanban jako droppable zone:
- Przyjmuje `stage` i `deals` jako props
- Używa `useDroppable` z @dnd-kit/core
- Stylizacja wskazująca aktywny drop target

### 3. Nowy komponent `DraggableDealCard.tsx`

```
src/components/deals/DraggableDealCard.tsx
```

Wrapper dla DealCard z obsługą draggable:
- Używa `useDraggable` z @dnd-kit/core
- Przekazuje deal do DealCard
- Obsługuje stany dragowania (opacity, transform)

### 4. Aktualizacja `DealsKanban.tsx`

Główne zmiany:
- Import `DndContext`, `DragOverlay`, `PointerSensor`, `useSensor`, `useSensors`
- Stan `activeDeal` dla drag overlay
- `handleDragStart` - ustawia aktywny deal
- `handleDragEnd` - wywołuje `moveDeal.mutate()` i czyści stan
- `PointerSensor` z `activationConstraint: { distance: 8 }` (zapobiega przypadkowemu dragowi)

### 5. Aktualizacja eksportu

Dodanie nowych komponentów do `src/components/deals/index.ts`

## Szczegóły techniczne

### Struktura DndContext:

```text
┌─────────────────────────────────────────────────────────────┐
│  DndContext                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ KanbanColumn│  │ KanbanColumn│  │ KanbanColumn│   ...   │
│  │ (droppable) │  │ (droppable) │  │ (droppable) │         │
│  │             │  │             │  │             │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │DragCard │ │  │ │DragCard │ │  │ │DragCard │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  │ ┌─────────┐ │  │             │  │             │         │
│  │ │DragCard │ │  │             │  │             │         │
│  │ └─────────┘ │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │ DragOverlay (renderuje aktywną kartę)       │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Obsługa stanów wyścigowych (race conditions):

Zgodnie z zaleceniami z lovable-stack-overflow, użycie functional update dla `setActiveDeal`:

```typescript
setActiveDeal((prevActiveDeal) => {
  if (prevActiveDeal && prevActiveDeal.id === dealId) {
    return null;
  }
  return prevActiveDeal;
});
```

## Pliki do utworzenia/modyfikacji

| Plik | Operacja |
|------|----------|
| `src/components/deals/KanbanColumn.tsx` | Nowy plik |
| `src/components/deals/DraggableDealCard.tsx` | Nowy plik |
| `src/components/deals/DealsKanban.tsx` | Modyfikacja - dodanie DndContext |
| `src/components/deals/index.ts` | Aktualizacja eksportów |

## Efekt końcowy

Po implementacji użytkownik będzie mógł:
1. Kliknąć i przytrzymać kartę deala
2. Przeciągnąć ją do innej kolumny (etapu)
3. Upuścić - deal automatycznie zmieni etap w bazie danych
4. Widzieć wizualny feedback podczas przeciągania (overlay karty)

