
# Plan: TableView + TeamStats + TeamSettings + Polish

## Cel
Finalizacja modułu Deals Team Dashboard przez dodanie widoku tabelarycznego, statystyk zespołu, panelu ustawień oraz poprawienie UX (loading states, empty states).

## Analiza obecnego stanu

### Istniejące komponenty (prompty 5.7-5.8)
- `DealsTeamDashboard.tsx` - strona glowna z placeholder dla widoku tabelarycznego
- `KanbanBoard.tsx` + `KanbanColumn.tsx` - widok Kanban
- Karty: `HotLeadCard`, `TopLeadCard`, `LeadCard`, `ProspectCard`
- Dialogi: `CreateTeamDialog`, `AddContactDialog`, `AddProspectDialog`, `PromoteDialog`, `ConvertProspectDialog`
- `WeeklyStatusPanel.tsx` + `WeeklyStatusForm.tsx`
- `TeamSelector.tsx` - bez funkcjonalnosci ustawien

### Istniejace hooki
- `useTeamContacts(teamId)` - kontakty dealowe z JOIN
- `useTeamContactStats(teamId)` - statystyki obliczane z kontaktow
- `useTeamProspects(teamId)` - poszukiwani
- `useTeamMembers(teamId)` - czlonkowie zespolu
- `useDirectorsByTenant()` - directorzy w tenancie
- `useUpdateDealTeam()` - aktualizacja zespolu
- `useAddTeamMember()`, `useRemoveTeamMember()`, `useUpdateMemberRole()` - zarzadzanie czlonkami

### Biblioteki dostepne
- `xlsx` - eksport do Excel
- shadcn/ui - Table, Skeleton, Badge, Tabs, Sheet, Dialog

## Pliki do utworzenia

### 1. `src/components/deals-team/TeamStats.tsx`

4 karty statystyk wyswietlane NAD Kanbanem/tabela:

```text
+-------------------+-------------------+-------------------+-------------------+
|   HOT Leads 🔥    |   TOP Leads ⭐   |   Leads 📋        |  Poszukiwani 🔍  |
|       (3)         |       (5)         |       (8)         |       (2)         |
| Wartosc: 150k PLN |  Gotowe do awansu |    W kolejce      | 1 skonwertowany   |
| ⚠️ 1 bez statusu  |                   |                   |                   |
+-------------------+-------------------+-------------------+-------------------+
```

**Dane**:
- HOT/TOP/LEAD/overdue/total_value z `useTeamContactStats(teamId)`
- Poszukiwani: `useTeamProspects(teamId)` - oblicz total i converted

**Responsywnosc**:
- Mobile: 2 kolumny (`grid-cols-2`)
- Desktop: 4 kolumny (`lg:grid-cols-4`)

### 2. `src/components/deals-team/TableView.tsx`

Widok tabelaryczny z sortowaniem, filtrami i eksportem XLSX.

**Kolumny**:
| Kolumna | Zrodlo | Sortowalna |
|---------|--------|------------|
| Kontakt | contact.full_name | Tak |
| Firma | contact.company | Tak |
| Kategoria | category | Tak |
| Status | status | Tak |
| Priorytet | priority | Tak |
| Odpowiedzialny | assigned_to → lookup | Tak |
| Nast. akcja | next_action | Nie |
| Nast. spotkanie | next_meeting_date | Tak |
| Wartosc | estimated_value | Tak |
| Ostatni status | last_status_update | Tak |

**Filtry** (row nad tabela):
- Kategoria (multi-select: HOT, TOP, LEAD)
- Status (select: active, on_hold, won, lost)
- Odpowiedzialny (select z czlonkow zespolu)
- Priorytet (select: urgent, high, medium, low)
- Toggle: Tylko przeterminowane

**Sortowanie**:
- Klikniecie naglowka → ASC → DESC → reset
- Domyslne: priority DESC, category (hot first)

**Eksport XLSX**:
```typescript
import { utils, writeFile } from 'xlsx';

function exportToXlsx(filteredContacts: DealTeamContact[]) {
  const data = filteredContacts.map(c => ({
    'Kontakt': c.contact?.full_name || '',
    'Firma': c.contact?.company || '',
    'Kategoria': c.category.toUpperCase(),
    // ... pozostale kolumny
  }));
  
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Deals Team');
  writeFile(wb, `deals-team-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  toast.success('Wyeksportowano do XLSX');
}
```

### 3. `src/components/deals-team/TeamSettings.tsx`

Sheet z ustawieniami zespolu - otwierany z ikony Settings przy TeamSelector.

**Sekcje**:

```text
+-------------------------------------+
| Ustawienia zespolu            [X]  |
+-------------------------------------+
| Nazwa zespolu                       |
| [input: Zespol Sprzedazy A    ]    |
|                                     |
| Opis                                |
| [textarea: Glowny zespol...   ]    |
|                                     |
| Kolor                               |
| ● ● ● ● ● ● ● ● (8 predefiniowanych)|
|                                     |
| Dzien statusow                      |
| [Poniedzialek ▼]                   |
|                                     |
| [Zapisz zmiany]                     |
+-------------------------------------+
| Czlonkowie (4)                      |
|                                     |
| 👤 Jan Kowalski  [Leader ▼] [X]    |
|    jan@firma.pl                     |
| 👤 Anna Nowak    [Member ▼] [X]    |
+-------------------------------------+
| Dodaj czlonka                       |
| [Szukaj directora...] [+ Dodaj]    |
+-------------------------------------+
```

**Logika**:
- Edycja nazwy/opisu/koloru: `useUpdateDealTeam()`
- Zmiana roli: `useUpdateMemberRole()`
- Usuniecie czlonka: `useRemoveTeamMember()` z potwierdzeniem
- Dodanie czlonka: `useAddTeamMember()` + wyszukiwarka directorow

**Wyszukiwarka directorow**:
- Query: `useDirectorsByTenant()` + filtr local po full_name
- Nie pokazuj tych ktorzy juz sa w zespole

**Kolory preset**:
```typescript
const colorPresets = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
];
```

## Modyfikacje istniejacych plikow

### 1. `src/pages/DealsTeamDashboard.tsx`

**Zmiany**:
- Import `TeamStats`, `TableView`, `TeamSettings`
- Dodanie state `showTeamSettings`
- Przekazanie `onSettingsClick` do `TeamSelector`
- Renderowanie `TeamStats` miedzy header a Kanban/tabela
- Zamiana placeholder widoku tabelarycznego na `TableView`
- Renderowanie `TeamSettings` Sheet

### 2. `src/components/deals-team/TeamSelector.tsx`

**Zmiany**:
- Props: `onSettingsClick?: () => void` - juz jest, tylko wywolanie
- Przycisk Settings juz istnieje, upewnic sie ze wywoluje callback

### 3. `src/components/deals-team/KanbanColumn.tsx`

**Zmiany**:
- Dodanie empty state gdy `children` jest puste
- Rozne komunikaty CTA dla kazdej kategorii

```typescript
// Props: emptyMessage?: string
// W ScrollArea gdy brak dzieci:
{React.Children.count(children) === 0 && (
  <p className="text-sm text-muted-foreground text-center py-4">
    {emptyMessage || 'Brak elementow'}
  </p>
)}
```

### 4. `src/components/deals-team/KanbanBoard.tsx`

**Zmiany**:
- Przekazanie `emptyMessage` do kazdej kolumny:
  - HOT: "Brak HOT leadow. Awansuj kontakty z TOP"
  - TOP: "Brak TOP leadow. Awansuj kontakty z LEAD"
  - LEAD: "Brak leadow. Dodaj kontakty z CRM"
  - POSZUKIWANI: "Brak poszukiwanych. Dodaj osobe/firme"

### 5. `src/components/deals-team/index.ts`

**Zmiany**:
- Eksport nowych komponentow: `TeamStats`, `TableView`, `TeamSettings`

## Struktura plikow

```text
src/components/deals-team/
├── TeamStats.tsx          ← NOWY
├── TableView.tsx          ← NOWY
├── TeamSettings.tsx       ← NOWY
├── KanbanColumn.tsx       ← MODYFIKACJA (empty state)
├── KanbanBoard.tsx        ← MODYFIKACJA (empty messages)
├── index.ts               ← MODYFIKACJA (nowe eksporty)
└── ... (pozostale bez zmian)

src/pages/
└── DealsTeamDashboard.tsx ← MODYFIKACJA (integracja)
```

## Sekcja techniczna

### Komponenty shadcn/ui
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` (TableView)
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` (TeamSettings)
- `Card`, `CardContent`, `CardHeader` (TeamStats)
- `Skeleton` (loading states)
- `Select`, `Checkbox`, `Input`, `Button`, `Badge`
- `AlertDialog` (potwierdzenie usuniecia czlonka)

### Sortowanie w TableView
```typescript
type SortConfig = {
  column: string;
  direction: 'asc' | 'desc' | null;
};

const [sortConfig, setSortConfig] = useState<SortConfig>({
  column: 'priority',
  direction: 'desc'
});

const handleSort = (column: string) => {
  setSortConfig(prev => {
    if (prev.column !== column) return { column, direction: 'asc' };
    if (prev.direction === 'asc') return { column, direction: 'desc' };
    if (prev.direction === 'desc') return { column: '', direction: null };
    return { column, direction: 'asc' };
  });
};

// Ikona sortowania w naglowku:
{sortConfig.column === 'name' && (
  sortConfig.direction === 'asc' ? <ArrowUp /> : <ArrowDown />
)}
```

### Filtrowanie w TableView
```typescript
const [filters, setFilters] = useState({
  categories: [] as DealCategory[],
  status: '',
  assignedTo: '',
  priority: '',
  overdueOnly: false,
});

const filteredContacts = useMemo(() => {
  return contacts.filter(c => {
    if (filters.categories.length > 0 && !filters.categories.includes(c.category)) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.assignedTo && c.assigned_to !== filters.assignedTo) return false;
    if (filters.priority && c.priority !== filters.priority) return false;
    if (filters.overdueOnly && !c.status_overdue) return false;
    return true;
  });
}, [contacts, filters]);
```

### Lookup assigned_to w TableView
```typescript
// Uzyj useTeamMembers(teamId) do mapy director_id → full_name
const { data: members = [] } = useTeamMembers(teamId);
const memberMap = useMemo(() => 
  new Map(members.map(m => [m.director_id, m.director?.full_name || 'Nieznany'])),
  [members]
);

// W kolumnie:
{contact.assigned_to ? memberMap.get(contact.assigned_to) || '—' : '—'}
```

### Relative time dla last_status_update
```typescript
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

// W kolumnie:
{contact.last_status_update ? (
  contact.status_overdue ? (
    <span className="text-destructive font-medium">
      ⚠️ {formatDistanceToNow(new Date(contact.last_status_update), { locale: pl, addSuffix: true })}
    </span>
  ) : (
    formatDistanceToNow(new Date(contact.last_status_update), { locale: pl, addSuffix: true })
  )
) : (
  <span className="text-muted-foreground">Brak</span>
)}
```

## Guardrails
- NIE usuwam ani nie przebudowuje komponentow z promptow 5.7-5.8
- NIE modyfikuje hookow - tylko importuje i uzywa
- NIE tworze tabel SQL
- Eksport XLSX: `import { utils, writeFile } from 'xlsx'`
- TableView: filtry dzialaja na froncie (filtruj dane z useTeamContacts)
- TeamSettings: wyszukiwarka directorow → `useDirectorsByTenant()` + filtr local
- Skeleton loading: `import { Skeleton } from '@/components/ui/skeleton'`

## Testy akceptacyjne

1. Przelacznik widoku: Kanban ↔ Tabela dziala, oba widoki pokazuja te same dane
2. TeamStats: 4 karty statystyk wyswietlaja poprawne liczby
3. TableView: tabela renderuje wszystkie kontakty
4. Sortowanie: klikniecie naglowka sortuje A-Z → Z-A → reset
5. Filtry: filtr Kategoria = HOT → tylko HOT w tabeli
6. Eksport XLSX: przycisk generuje plik .xlsx
7. TeamSettings: edycja nazwy zespolu → TeamSelector odswierza nazwe
8. TeamSettings: dodanie/usuniecie czlonka dziala
9. Loading: skeleton loading widoczny przy ladowaniu
10. Empty state: komunikaty CTA w pustych kolumnach
