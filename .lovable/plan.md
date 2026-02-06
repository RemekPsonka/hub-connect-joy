

# Plan: UI — Strona DealsTeamDashboard + TeamSelector + KanbanBoard + Karty kontaktów + Routing

## Cel
Utworzenie głównego widoku UI modułu "Zespół Deals" — strona `/deals-team` z 4-kolumnowym Kanbanem (HOT, TOP, LEAD, POSZUKIWANI), selektorem zespołu i kartami kontaktów.

## Stan obecny

### Istniejące hooki (gotowe do użycia)
- `useDealTeams.ts` — `useMyDealTeams()`, `useCreateDealTeam()`
- `useDealsTeamMembers.ts` — `useTeamMembers()`, `useDirectorsByTenant()`
- `useDealsTeamContacts.ts` — `useTeamContacts()`, `useTeamContactStats()`, `useAddContactToTeam()`, `usePromoteContact()`

### Brakujące hooki (trzeba utworzyć)
- `useDealsTeamProspects.ts` — brak, trzeba dodać dla kolumny POSZUKIWANI
- Typy w `src/types/dealTeam.ts` są kompletne

### Istniejące wzorce w projekcie
- Strona `Deals.tsx` — wzorzec dla głównej strony z Kanbanem i statystykami
- `DealsKanban.tsx` — wzorzec dla tablicy Kanban (bez drag & drop w nowym module)
- `AppSidebar.tsx` — sekcja "Sieć" zawiera wpis "Deals" — tam dodamy "Zespół Deals"
- `App.tsx` — routing z `DirectorGuard`, lazy loading

## Pliki do utworzenia

### 1. Hook dla prospektów: `src/hooks/useDealsTeamProspects.ts`

Brakujący hook do obsługi tabeli `deal_team_prospects`:

| Funkcja | Opis |
|---------|------|
| `useTeamProspects(teamId)` | Lista prospektów zespołu |
| `useCreateProspect()` | Dodanie nowego poszukiwanego |
| `useUpdateProspect()` | Edycja danych |
| `useConvertProspect()` | Konwersja do LEAD (placeholder) |

### 2. Strona główna: `src/pages/DealsTeamDashboard.tsx`

Layout strony:
```text
┌─────────────────────────────────────────────────────────────┐
│ [TeamSelector ▼]  [⚙️ Ustawienia]  [📊│📋 Widok]           │
├─────────────────────────────────────────────────────────────┤
│                     KanbanBoard                             │
│  HOT 🔥  │  TOP ⭐  │  LEAD 📋  │  POSZUKIWANI 🔍          │
│  (3)     │  (5)     │  (8)      │  (2)                      │
│ [Card]   │ [Card]   │ [Card]    │ [Card]                    │
│ [Card]   │ [Card]   │ [Card]    │ [Card]                    │
│ [+Dodaj] │ [+Dodaj] │ [+Dodaj]  │ [+Szukaj]                 │
└─────────────────────────────────────────────────────────────┘
```

Logika:
- `selectedTeamId` w `useState` + persystencja `localStorage('deals-team-selected')`
- Pusty stan z CTA "Utwórz pierwszy zespół" gdy brak zespołów
- Przełącznik widoku Kanban/Tabela (Tabela = placeholder)
- Użycie `useMyDealTeams()`, `useTeamContacts()`, `useTeamContactStats()`

### 3. Selektor zespołu: `src/components/deals-team/TeamSelector.tsx`

Dropdown z shadcn/ui Select:
- Lista zespołów użytkownika z kolorowym wskaźnikiem
- Badge z liczbą HOT i przeterminowanych
- Przycisk ustawień zespołu (ikona Settings)

### 4. Tablica Kanban: `src/components/deals-team/KanbanBoard.tsx`

4 kolumny w CSS grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`):

| Kolumna | Kolor | Dane | Przycisk |
|---------|-------|------|----------|
| HOT LEAD 🔥 | red | `category='hot'` | + Dodaj |
| TOP LEAD ⭐ | amber | `category='top'` | + Dodaj |
| LEAD 📋 | blue | `category='lead'` | + Dodaj |
| POSZUKIWANI 🔍 | purple | prospects | + Szukaj |

Wewnętrzny komponent `KanbanColumn`:
- Nagłówek z ikoną, nazwą, ilością, sumą wartości (HOT)
- Kolorowy border-top (2px)
- `max-height` z `overflow-y-auto` dla scroll
- Karty posortowane: priority DESC, next_action_date ASC

### 5. Karty kontaktów

**HotLeadCard.tsx** — najbogatsza karta:
- Imię + link do kontaktu + firma + stanowisko
- Status badge + wskaźnik cotygodniowy (zielona/czerwona kropka)
- Najbliższe spotkanie (ikona kalendarza + data)
- Następna akcja (tło muted + termin)
- Wartość szacunkowa (zielony tekst)
- Border-left 4px czerwony

**TopLeadCard.tsx** — uproszczona:
- Imię + firma
- Następna akcja
- Wskaźnik cotygodniowy
- Priority badge
- Przycisk "↑ do HOT" → `toast.info("Wkrótce — prompt 5.8")`

**LeadCard.tsx** — minimalna:
- Imię + firma
- Priority badge (kolorowy)
- Notatka (1 linia, truncate)
- Przycisk "↑ do TOP" → placeholder

**ProspectCard.tsx** — karta poszukiwanego:
- Nazwa osoby/firmy (pogrubiona)
- Stanowisko
- "Dla: {requested_by}" + "Szuka: {assigned_to}"
- Mini-stepper statusu (searching → found → intro → meeting → converted)
- Priority badge
- Przycisk "Konwertuj do LEAD" → placeholder

### 6. Dialogi

**AddContactDialog.tsx**:
- Wyszukiwarka kontaktów CRM (ilike na full_name)
- Select kategorii (pre-filled z kolumny)
- Select priorytetu
- Przycisk "Dodaj" → `useAddContactToTeam()`

**AddProspectDialog.tsx**:
- Pola: imię/nazwa, firma, stanowisko, email, LinkedIn, telefon, notatki
- Select "Dla kogo szukamy" (członkowie zespołu)
- Select "Kto szuka" (członkowie zespołu)
- Priorytet, deadline
- Przycisk "Dodaj" → `useCreateProspect()`

**CreateTeamDialog.tsx**:
- Nazwa zespołu
- Opis (opcjonalnie)
- Kolor (color picker lub preset)
- Przycisk "Utwórz" → `useCreateDealTeam()`

### 7. Routing i Sidebar

**App.tsx** — nowa trasa:
```tsx
const DealsTeamDashboard = lazy(() => import("./pages/DealsTeamDashboard"));

<Route path="/deals-team" element={<DirectorGuard><DealsTeamDashboard /></DirectorGuard>} />
```

**AppSidebar.tsx** — nowy wpis w sekcji "Sieć":
```tsx
const networkNavigationItems = [
  { title: 'Sieć kontaktów', url: '/network', icon: Network },
  { title: 'Ofertowanie', url: '/pipeline', icon: Briefcase },
  { title: 'Deals', url: '/deals', icon: TrendingUp },
  { title: 'Zespół Deals', url: '/deals-team', icon: Users },  // ← NOWY
];
```

## Struktura plików

```text
src/
├── pages/
│   └── DealsTeamDashboard.tsx           ← NOWY: główna strona
├── hooks/
│   └── useDealsTeamProspects.ts         ← NOWY: CRUD dla prospects
└── components/
    └── deals-team/                       ← NOWY folder
        ├── index.ts                      ← eksporty
        ├── TeamSelector.tsx              ← dropdown zespołów
        ├── KanbanBoard.tsx               ← 4-kolumnowa tablica
        ├── KanbanColumn.tsx              ← pojedyncza kolumna
        ├── HotLeadCard.tsx               ← karta HOT
        ├── TopLeadCard.tsx               ← karta TOP
        ├── LeadCard.tsx                  ← karta LEAD
        ├── ProspectCard.tsx              ← karta POSZUKIWANY
        ├── AddContactDialog.tsx          ← dialog dodawania kontaktu
        ├── AddProspectDialog.tsx         ← dialog dodawania prospectu
        └── CreateTeamDialog.tsx          ← dialog tworzenia zespołu
```

## Przepływ danych

```text
DealsTeamDashboard
│
├── useMyDealTeams() → lista zespołów użytkownika
│   └── selectedTeamId (useState + localStorage)
│
├── TeamSelector
│   ├── teams (z useMyDealTeams)
│   └── stats (z useTeamContactStats)
│
└── KanbanBoard (teamId)
    ├── useTeamContacts(teamId) → filtr po category
    │   ├── HOT → HotLeadCard[]
    │   ├── TOP → TopLeadCard[]
    │   └── LEAD → LeadCard[]
    │
    └── useTeamProspects(teamId)
        └── POSZUKIWANI → ProspectCard[]
```

## Sekcja techniczna

### Komponenty shadcn/ui używane
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Badge` (variant: default, secondary, destructive, outline)
- `Button` (variant: default, ghost, outline; size: default, sm, icon)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `Input`, `Textarea`, `Label`
- `Tooltip`, `TooltipTrigger`, `TooltipContent`
- `ScrollArea`

### Ikony lucide-react
- `Users`, `Settings`, `Plus`, `Calendar`, `Search`
- `ArrowUp`, `Flame`, `Star`, `FileText`
- `User`, `Building2`, `Phone`, `Mail`, `Linkedin`

### Formatowanie dat
```tsx
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

format(new Date(date), 'dd MMM', { locale: pl })
```

### Responsywność
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

### localStorage persistence
```tsx
const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
  return localStorage.getItem('deals-team-selected') || '';
});

useEffect(() => {
  if (selectedTeamId) {
    localStorage.setItem('deals-team-selected', selectedTeamId);
  }
}, [selectedTeamId]);
```

### Placeholder dla przycisków promocji
```tsx
onClick={() => toast.info('Wkrótce — prompt 5.8')}
```

## Guardrails
- NIE modyfikuję istniejących stron (Dashboard, Pipeline, Contacts, Settings)
- NIE modyfikuję istniejących hooków — tylko importuję i używam
- NIE implementuję drag & drop — promocja tylko przez przyciski
- Przyciski "↑ do HOT/TOP", "Konwertuj do LEAD" = placeholder z toast
- Używam tylko shadcn/ui i lucide-react
- Responsive grid: 1→2→4 kolumny

