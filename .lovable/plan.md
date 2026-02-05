
# Plan: Dodanie virtualizacji do ContactsTable

## Cel
Zoptymalizować wydajność renderowania listy kontaktów przy dużych zbiorach danych (>100 elementów) poprzez wirtualizację z `@tanstack/react-virtual`.

---

## Wzorzec z CompaniesTable.tsx

```typescript
const ROW_HEIGHT = 56;
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: companies.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
});
```

---

## Zmiany w ContactsTable.tsx

### 1. Importy

Dodać na początku pliku:
```typescript
import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
```

### 2. Stała ROW_HEIGHT

Dodać przed interfejsem:
```typescript
const ROW_HEIGHT = 56; // Wysokość wiersza tabeli kontaktów
```

### 3. Virtualizer hook

Dodać wewnątrz komponentu (po useState, przed funkcjami):
```typescript
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: contacts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
});
```

### 4. Struktura tabeli (linie ~229-354)

**PRZED:**
```tsx
<div className="border rounded-lg">
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>
      {contacts.map((contact) => (
        <TableRow>...</TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**PO:**
```tsx
<div className="border rounded-lg overflow-hidden">
  {/* Sticky Header */}
  <div className="bg-background border-b">
    <Table className="table-fixed w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">...</TableHead>
          <TableHead className="w-[200px]">...</TableHead>
          <TableHead className="w-[150px]">...</TableHead>
          <TableHead className="w-[120px]">...</TableHead>
          <TableHead className="w-[130px]">...</TableHead>
          <TableHead className="w-[180px]">...</TableHead>
          <TableHead className="w-[100px]">...</TableHead>
          <TableHead className="w-[140px]">...</TableHead>
          <TableHead className="w-[120px]">...</TableHead>
        </TableRow>
      </TableHeader>
    </Table>
  </div>
  
  {/* Virtualized Body */}
  <div
    ref={parentRef}
    className="overflow-auto"
    style={{ maxHeight: 'calc(100vh - 350px)' }}
  >
    <Table className="table-fixed w-full">
      <TableBody>
        <tr style={{ height: virtualizer.getTotalSize() }}>
          <td colSpan={9} className="p-0 relative">
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const contact = contacts[virtualItem.index];
              return (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/50 absolute w-full flex"
                  style={{
                    height: ROW_HEIGHT,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  {/* Wszystkie TableCell z flex-shrink-0 i stałą szerokością */}
                </TableRow>
              );
            })}
          </td>
        </tr>
      </TableBody>
    </Table>
  </div>
</div>
```

### 5. Szerokości kolumn

| Kolumna | Szerokość |
|---------|-----------|
| Checkbox | w-[50px] |
| Imię i nazwisko | w-[200px] |
| Firma | w-[150px] |
| Stanowisko | w-[120px] |
| Telefon | w-[130px] |
| Email | w-[180px] |
| Grupa | w-[100px] |
| Profil AI | w-[140px] |
| Siła relacji | w-[120px] |

### 6. Opcja "200" w paginacji

Dodać do SelectContent (linia ~365-369):
```tsx
<SelectItem value="200">200</SelectItem>
```

---

## Co pozostaje bez zmian

| Element | Status |
|---------|--------|
| Logika selekcji (selectedIds) | Bez zmian |
| Bulk actions (handleBulkAssignGroup, handleBulkDelete) | Bez zmian |
| Sortowanie (handleSort) | Bez zmian |
| Generowanie profilu AI | Bez zmian |
| Paginacja | Bez zmian (tylko +200) |
| Event handlery | Wszystkie zachowane |

---

## Plik do modyfikacji

- `src/components/contacts/ContactsTable.tsx`

---

## Techniczne szczegóły

- **ROW_HEIGHT = 56px** - standardowa wysokość wiersza tabeli (sprawdzona w CompaniesTable)
- **overscan = 10** - renderuje 10 dodatkowych wierszy poza viewport dla płynnego scrollowania
- **colSpan = 9** - liczba kolumn w tabeli kontaktów
- **maxHeight: calc(100vh - 350px)** - pozostawia miejsce na header, bulk actions i paginację
