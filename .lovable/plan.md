

# Dodanie kolumn sub-Kanban dla OFERTOWANIE

## Problem
Po kliknieciu w naglowek kolumny OFERTOWANIE, kontakty wyswietlaja sie w plaskim ukladzie siatki (grid) zamiast w kolumnach sub-Kanban. Dzieje sie tak, poniewaz kategoria `offering` nie ma wpisu w `SUB_KANBAN_CONFIGS`, wiec system uzywa uproszczonego widoku fokusowego.

## Rozwiazanie
Dodac konfiguracje sub-Kanban dla kategorii `offering` z odpowiednimi etapami ofertowania.

## Etapy ofertowania (kolumny)

```text
Handshake --> Pelnomocnictwo --> Przygotowanie --> Negocjacje --> Zaakceptowano --> Przegrano
```

## Zmiany techniczne

**Plik: `src/components/deals-team/SubKanbanView.tsx`**

Dodac nowy wpis w `SUB_KANBAN_CONFIGS`:

```typescript
offering: {
  title: 'OFERTOWANIE',
  icon: '📝',
  defaultStage: 'handshake',
  stages: [
    { id: 'handshake',        label: 'Handshake',       icon: '🤝', color: 'border-t-slate-500' },
    { id: 'power_of_attorney', label: 'Pelnomocnictwo', icon: '📄', color: 'border-t-blue-500' },
    { id: 'preparation',      label: 'Przygotowanie',   icon: '📋', color: 'border-t-amber-500' },
    { id: 'negotiation',      label: 'Negocjacje',      icon: '💬', color: 'border-t-purple-500' },
    { id: 'accepted',         label: 'Zaakceptowano',   icon: '✅', color: 'border-t-green-500' },
    { id: 'lost',             label: 'Przegrano',       icon: '✖️', color: 'border-t-gray-400' },
  ],
},
```

Dzieki temu klikniecie w naglowek OFERTOWANIE otworzy widok SubKanbanView z 6 kolumnami zamiast plaskiej siatki. Zmiana w jednym miejscu, bez koniecznosci modyfikacji KanbanBoard.tsx (logika juz poprawnie sprawdza `SUB_KANBAN_CONFIGS`).
