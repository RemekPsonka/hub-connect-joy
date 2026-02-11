

# Drag & Drop miedzy kolumnami + Popup zamiast nawigacji

## Zakres zmian

1. **Drag & Drop** -- mozliwosc przeciagania kart kontaktow miedzy kolumnami HOT/TOP/LEAD/COLD (analogicznie do TasksKanban)
2. **Klikniecie otwiera popup** -- klikniecie w karte otwiera `DealContactDetailSheet` (juz dzisiaj dziala tak z KanbanBoard). Natomiast w kartach (`HotLeadCard`, `TopLeadCard`, `LeadCard`, `ColdLeadCard`) sa `<Link>` do profilu kontaktu, ktore trzeba zamienic na zwykly tekst -- nawigacja na karte kontaktu bedzie dostepna wylacznie przez hiperlink w popupie (`DealContactDetailSheet` juz ma link "Otworz profil CRM").

## Pliki do modyfikacji

| Plik | Zmiana |
|---|---|
| `src/components/deals-team/KanbanColumn.tsx` | Dodanie props `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` + kolor `slate` + wizualne wskazniki drop zone |
| `src/components/deals-team/KanbanBoard.tsx` | Logika drag & drop (handleDragStart/End/Over/Enter/Leave/Drop), zmiana kategorii przez `useUpdateTeamContact`, przekazanie eventow do KanbanColumn |
| `src/components/deals-team/HotLeadCard.tsx` | Zamiana `<Link>` na `<span>`, dodanie `draggable` + `onDragStart/End` |
| `src/components/deals-team/TopLeadCard.tsx` | Zamiana `<Link>` na `<span>`, dodanie `draggable` + `onDragStart/End`, untangling promote `onClick` od card `onClick` |
| `src/components/deals-team/LeadCard.tsx` | Zamiana `<Link>` na `<span>`, dodanie `draggable` + `onDragStart/End` |
| `src/components/deals-team/ColdLeadCard.tsx` | Zamiana `<Link>` na `<span>`, dodanie `draggable` + `onDragStart/End` |

## Szczegoly techniczne

### 1. Drag & Drop (natywny HTML5, bez dodatkowych bibliotek)

Wzorzec identyczny jak w `TasksKanban.tsx`:

```text
KanbanBoard:
  - state: draggingContactId, dragOverColumn
  - handleDragStart(e, contactId): ustawia draggingContactId, dataTransfer
  - handleDragEnd(): resetuje state
  - handleDragOver(e): preventDefault
  - handleDragEnter(e, columnId): ustawia dragOverColumn
  - handleDragLeave(e): resetuje dragOverColumn (jesli wyszedl z kolumny)
  - handleDrop(e, category): pobiera contactId z dataTransfer, 
    jesli kategoria sie zmienila -> updateContact.mutate({ id, teamId, category })
```

### 2. KanbanColumn -- nowe props

```text
+ onDragOver?: (e: React.DragEvent) => void
+ onDragEnter?: (e: React.DragEvent) => void
+ onDragLeave?: (e: React.DragEvent) => void
+ onDrop?: (e: React.DragEvent) => void
+ isDropTarget?: boolean
```

Gdy `isDropTarget === true`:
- Kolumna podswietla sie (ring-2, bg-primary/5)
- Pojawia sie "Upusc tutaj" placeholder na dole

Dodanie `slate` do `colorClasses`.

### 3. Karty -- zmiany

Kazda karta (Hot/Top/Lead/Cold) dostanie:
- `draggable` na `<Card>`
- `onDragStart` / `onDragEnd` props (przekazane z KanbanBoard)
- `<Link to={...}>` zamieniony na `<span className="font-medium text-sm block truncate">` -- bez nawigacji na klikniecie
- Wizualne oznaczenie podczas przeciagania (opacity, scale)

Nowe props kart:
```text
+ onDragStart?: (e: React.DragEvent) => void
+ onDragEnd?: () => void
+ isDragging?: boolean
```

### 4. Nawigacja do profilu

- Karty: **brak** linku do profilu -- klikniecie otwiera popup `DealContactDetailSheet`
- Popup: link "Otworz profil CRM" z ikona `ExternalLink` -- **juz istnieje** w liniach 198-205 DealContactDetailSheet -- bez zmian

### 5. Kolumna POSZUKIWANI

Kolumna POSZUKIWANI nie uczestnicy w drag & drop (prospekty to inny typ danych). Przeciaganie bedzie ograniczone do 4 kolumn: HOT, TOP, LEAD, COLD.

