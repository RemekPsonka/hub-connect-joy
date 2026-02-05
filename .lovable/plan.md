

# Plan: Dodanie virtualizacji do modali wyboru kontaktów

## Podsumowanie analizy

Po przeanalizowaniu wszystkich komponentów wyboru kontaktów/firm w projekcie, zidentyfikowałem **3 komponenty wymagające virtualizacji**:

| Komponent | Maks. elementów | Problem |
|-----------|-----------------|---------|
| `ConnectionContactSelect.tsx` | 100 | Pobiera 100, filtruje kliencko, renderuje wszystkie |
| `ConsultationModal.tsx` | 100 | Pobiera 100, renderuje wszystkie w CommandList |
| `AssignContactModal.tsx` | 100 (slice do 50) | Pobiera 100, renderuje 50 |
| `AddCapitalGroupMemberModal.tsx` | Bez limitu | Pobiera wszystkie firmy tenanta |

**Komponenty BEZ potrzeby zmian** (już zoptymalizowane):
- `ContactCombobox.tsx` - limit 20 w query
- `TaskContactFilter.tsx` - limit 20 w query
- `AddParticipantModal.tsx` - slice do 20 w renderze

---

## Strategia implementacji

Zamiast dodawać virtualizację do każdego komponentu osobno, stworzymy **uniwersalny komponent `VirtualizedCommandList`** który będzie można użyć jako drop-in replacement dla CommandList.

---

## Zmiana 1: Nowy komponent VirtualizedCommandList

**Plik:** `src/components/ui/virtualized-command-list.tsx`

```typescript
import { useRef, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CommandGroup } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface VirtualizedCommandListProps<T> {
  items: T[];
  renderItem: (item: T, virtualRow: { index: number; start: number }) => React.ReactNode;
  emptyMessage?: string;
  estimateSize?: number;
  className?: string;
  groupHeading?: string;
}

export function VirtualizedCommandList<T>({
  items,
  renderItem,
  emptyMessage = 'Brak wyników',
  estimateSize = 48,
  className,
  groupHeading,
}: VirtualizedCommandListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("max-h-[300px] overflow-auto", className)}
    >
      <CommandGroup heading={groupHeading}>
        <div
          style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(items[virtualRow.index], virtualRow)}
            </div>
          ))}
        </div>
      </CommandGroup>
    </div>
  );
}
```

---

## Zmiana 2: ConnectionContactSelect.tsx

**Plik:** `src/components/network/ConnectionContactSelect.tsx`

Dodać import i użyć virtualizacji dla `filteredContacts`:

```typescript
import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// W komponencie:
const listRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: filteredContacts.length,
  getScrollElement: () => listRef.current,
  estimateSize: () => 48,
  overscan: 10,
});

// Zamienić CommandList na:
<CommandList>
  <CommandEmpty>Brak kontaktów</CommandEmpty>
  <div ref={listRef} className="max-h-[300px] overflow-auto">
    <CommandGroup>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const contact = filteredContacts[virtualRow.index];
          return (
            <CommandItem
              key={contact.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              // ... reszta bez zmian
            />
          );
        })}
      </div>
    </CommandGroup>
  </div>
</CommandList>
```

---

## Zmiana 3: ConsultationModal.tsx

**Plik:** `src/components/consultations/ConsultationModal.tsx`

Analogiczna zmiana - dodać virtualizację dla listy kontaktów (linie 216-248).

---

## Zmiana 4: AssignContactModal.tsx

**Plik:** `src/components/representatives/AssignContactModal.tsx`

Usunąć `.slice(0, 50)` i dodać virtualizację - teraz może wyświetlać wszystkie 100 kontaktów płynnie.

---

## Zmiana 5: AddCapitalGroupMemberModal.tsx

**Plik:** `src/components/company/AddCapitalGroupMemberModal.tsx`

Dodać virtualizację dla `filteredCompanies` (linie 173-213).

---

## Szczegóły techniczne

| Parametr | Wartość | Uzasadnienie |
|----------|---------|--------------|
| `estimateSize` | 48px | Standardowa wysokość CommandItem z 2 liniami tekstu |
| `overscan` | 10 | Renderuje 10 dodatkowych elementów dla płynności |
| `maxHeight` | 300px | Zachowuje spójność z istniejącymi modalami |

---

## Co pozostanie bez zmian

| Element | Status |
|---------|--------|
| Wyszukiwanie/filtrowanie | Zachowane - filtrowanie działa przed virtualizacją |
| onSelect handlery | Bez zmian |
| Keyboard navigation | Może wymagać testów - cmdk obsługuje to natywnie |
| Komponenty z limitem < 50 | Bez zmian (niepotrzebna virtualizacja) |

---

## Pliki do modyfikacji

1. `src/components/network/ConnectionContactSelect.tsx` - dodać virtualizację
2. `src/components/consultations/ConsultationModal.tsx` - dodać virtualizację
3. `src/components/representatives/AssignContactModal.tsx` - usunąć slice, dodać virtualizację
4. `src/components/company/AddCapitalGroupMemberModal.tsx` - dodać virtualizację

---

## Uwagi

- **Keyboard navigation**: Biblioteka cmdk może wymagać dodatkowej konfiguracji do obsługi strzałek w virtualizowanej liście. Jeśli nie działa od razu, może być potrzebne użycie `aria-selected` i ręczne zarządzanie focusem.
- **Testowanie**: Zalecane przetestowanie z listą > 100 elementów aby zweryfikować płynność scrollowania.

