
# Plan: Wirtualizacja listy firm i listy zadań

## Podsumowanie

Zastosowanie wzorca virtualizacji z `@tanstack/react-virtual` do dwóch kolejnych list:
1. **CompaniesTable** - tabela firm
2. **TasksList** - lista zadań w formie kart

---

## Analiza komponentów

### 1. CompaniesTable (`src/components/contacts/CompaniesTable.tsx`)

**Obecna struktura:**
- Tabela HTML (`<Table>` z shadcn/ui)
- Sortowanie przez kliknięcie na nagłówki kolumn
- Paginacja po stronie backendu
- Wiersze: ~56px wysokości
- 6 kolumn: Nazwa firmy, Miasto, NIP, Osoba kluczowa, Telefon, Profil AI

**Strategia virtualizacji:**
- Identyczna jak w ContactsTable
- Rozdzielenie na sticky header + scrollable body
- `estimateSize: () => 56`
- `overscan: 10`
- Stałe szerokości kolumn z `table-fixed`

### 2. TasksList (`src/components/tasks/TasksList.tsx`)

**Obecna struktura:**
- Lista kart (`Card` z shadcn/ui)
- Karty o zmiennej wysokości (100-160px w zależności od treści)
- Checkbox do zmiany statusu
- Kliknięcie otwiera szczegóły
- Cross-taski mają dodatkową sekcję z powodem połączenia

**Strategia virtualizacji:**
- Użycie div-based virtualization (nie tabela)
- `estimateSize: () => 120` (średnia wysokość karty)
- `overscan: 5` (mniejszy overscan bo karty są większe)
- Kontener z `maxHeight` i `overflow-y: auto`

### 3. TasksKanban - BEZ ZMIAN

Kanban nie będzie wirtualizowany ponieważ:
- Każda kolumna ma osobną listę zadań (zwykle <30 elementów)
- Drag & drop wymaga fizycznej obecności elementów w DOM
- Virtualizacja kolidowałaby z logiką przeciągania

---

## Szczegóły implementacji

### CompaniesTable

```text
┌─────────────────────────────────────────────────────────┐
│ [Sticky Header]                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Nazwa firmy ▲ │ Miasto │ NIP │ Osoba │ Tel │ AI    │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [Scrollable Body - virtualized]                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Firma A         │ Warszawa │ 123.. │ Jan  │ +48 │ ▶ │ │
│ │ Firma B         │ Kraków   │ 456.. │ Anna │ +48 │ ▶ │ │
│ │ ... (tylko widoczne wiersze)                        │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [Pagination - zawsze widoczna]                          │
└─────────────────────────────────────────────────────────┘
```

**Zmiany:**
1. Import `useRef` i `useVirtualizer`
2. Stała `ROW_HEIGHT = 56`
3. Rozdzielenie tabeli na header/body
4. Absolutne pozycjonowanie wierszy z `translateY`
5. Dodanie opcji "200" w paginacji

### TasksList

```text
┌─────────────────────────────────────────────────────────┐
│ [Scrollable Container - virtualized]                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ ☑ Zadanie 1                    [urgent][call] │   │ │
│ │ │   Opis zadania...             Status: Pending │   │ │
│ │ │   Kontakt: Jan Kowalski                       │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ ☐ Zadanie 2                  [medium][cross]  │   │ │
│ │ │   Jan Kowalski ↔ Anna Nowak                   │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ │ ... (tylko widoczne karty)                          │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Zmiany:**
1. Import `useRef` i `useVirtualizer`
2. Stała `CARD_HEIGHT = 120` (szacunkowa wysokość karty)
3. Wrapper div z `maxHeight` i `overflow-auto`
4. Wirtualne karty z absolutnym pozycjonowaniem

---

## Pliki do modyfikacji

| # | Plik | Zmiany |
|---|------|--------|
| 1 | `src/components/contacts/CompaniesTable.tsx` | Dodanie virtualizacji tabeli |
| 2 | `src/components/tasks/TasksList.tsx` | Dodanie virtualizacji listy kart |

---

## Zachowana funkcjonalność

### CompaniesTable
- Sortowanie przez nagłówki kolumn
- Kliknięcie na firmę → nawigacja do kontaktu
- Generowanie profilu AI
- Paginacja
- Wyświetlanie osoby kluczowej i telefonu

### TasksList
- Checkbox do zmiany statusu
- Kliknięcie na kartę → otwarcie szczegółów
- Wyświetlanie kontaktów i cross-tasków
- Badge'e typu, priorytetu, statusu
- Sekcja "Powód połączenia" dla cross-tasków

---

## Bez zmian

- `src/components/contacts/ContactsTable.tsx` - już zwirtualizowany
- `src/components/tasks/TasksKanban.tsx` - drag & drop wymaga fizycznych elementów
- Hooki danych (`useCompanies`, `useTasks`)
- Edge Functions
- Baza danych

---

## Szczegóły techniczne

### CompaniesTable - kluczowe fragmenty kodu

```typescript
// Imports
import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Constants
const ROW_HEIGHT = 56;

// Virtualizer setup
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: companies.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
});

// Render structure:
// 1. Sticky header table
// 2. Scrollable div with parentRef
// 3. Virtual rows with translateY positioning
```

### TasksList - kluczowe fragmenty kodu

```typescript
// Imports
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Constants
const CARD_HEIGHT = 120;

// Virtualizer setup
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: tasks.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => CARD_HEIGHT,
  overscan: 5,
});

// Render structure:
// 1. Scrollable container with maxHeight
// 2. Inner div with getTotalSize() height
// 3. Virtual cards with absolute positioning
```

---

## Korzyści wydajnościowe

| Lista | Przed | Po |
|-------|-------|-----|
| Firmy (200 elementów) | 200 wierszy DOM | ~15-20 wierszy DOM |
| Zadania (100 elementów) | 100 kart DOM | ~8-12 kart DOM |

Redukcja elementów DOM o 85-90% przy dużych listach.
