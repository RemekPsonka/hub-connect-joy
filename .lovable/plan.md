
# Plan: WeeklyStatusPanel + PromoteDialog + ConvertProspectDialog

## Cel
Utworzenie 4 komponentów operacyjnych do zarządzania statusami cotygodniowymi, awansowaniem kontaktów i konwersją prospektów oraz podpięcie przycisków na istniejących kartach.

## Stan obecny

### Istniejące hooki (gotowe do użycia)
- `useTeamContacts()` — kontakty z flagą `status_overdue`
- `useTeamContactStats()` — statystyki z `overdue_count`
- `useUpdateTeamContact()` — aktualizacja pól kontaktu (w tym `category`, `assigned_to`, `next_meeting_date`)
- `useTeamMembers()` — lista członków zespołu do selectów
- `useConvertProspect()` — placeholder do rozszerzenia
- `useAddContactToTeam()` — dodawanie kontaktu do zespołu

### Brakujący hook (trzeba stworzyć)
- `useWeeklyStatuses` — CRUD dla tabeli `deal_team_weekly_statuses`:
  - `useWeeklyStatuses(teamId)` — statusy złożone w tym tygodniu
  - `useOverdueContacts(teamId)` — kontakty HOT/TOP z `status_overdue = true`
  - `useSubmitWeeklyStatus()` — wstawianie nowego statusu

### Istniejące karty z placeholder buttons
- `TopLeadCard.tsx:21-23` — `toast.info('Wkrótce — prompt 5.8')`
- `LeadCard.tsx:21-23` — `toast.info('Wkrótce — prompt 5.8')`
- `ProspectCard.tsx:37-39` — `toast.info('Wkrótce — prompt 5.8')`

### Schemat bazy `deal_team_weekly_statuses`
```typescript
{
  id: string;
  team_id: string;
  team_contact_id: string;
  tenant_id: string;
  week_start: string;
  status_summary: string;
  next_steps: string | null;
  blockers: string | null;
  meeting_happened: boolean | null;
  meeting_outcome: string | null;
  category_recommendation: string | null;
  reported_by: string;
  created_at: string | null;
}
```

## Pliki do utworzenia

### 1. Hook `src/hooks/useWeeklyStatuses.ts`

Hook CRUD dla cotygodniowych statusów:

| Funkcja | Opis |
|---------|------|
| `useWeeklyStatuses(teamId)` | Statusy złożone w bieżącym tygodniu |
| `useOverdueContacts(teamId)` | Kontakty HOT/TOP z `status_overdue = true` |
| `useSubmitWeeklyStatus()` | INSERT do `deal_team_weekly_statuses` |

Szczegóły implementacji:
- `week_start` obliczany automatycznie (poniedziałek bieżącego tygodnia)
- `reported_by` = `director.id` z `useAuth()`
- Po sukcesie invalidate: `['deal-team-contacts']`, `['weekly-statuses']`

### 2. Panel `src/components/deals-team/WeeklyStatusPanel.tsx`

Sheet (panel boczny) z dwoma sekcjami:

```text
┌─────────────────────────────────────┐
│ Cotygodniowe statusy          [✕]  │
│ Tydzień: 03.02 - 09.02.2026        │
├─────────────────────────────────────┤
│ ⚠️ Wymagają statusu (4)            │
│ 🔴 Jan Kowalski — HOT • 12 dni     │
│    [Dodaj status →]                 │
│ ...                                 │
├─────────────────────────────────────┤
│ ✅ Złożone w tym tygodniu (2)       │
│ ✅ Maria Wiśniewska — "Spotkanie..."│
└─────────────────────────────────────┘
```

Props:
- `teamId: string`
- `open: boolean`
- `onOpenChange: (open: boolean) => void`

Logika:
- `useOverdueContacts(teamId)` → sekcja "Wymagają statusu"
- `useWeeklyStatuses(teamId)` → sekcja "Złożone w tym tygodniu"
- Sortowanie: najdłużej bez statusu na górze
- Stan `selectedContactId` do otwierania `WeeklyStatusForm`

### 3. Formularz `src/components/deals-team/WeeklyStatusForm.tsx`

Dialog z formularzem react-hook-form + zod:

```typescript
const weeklyStatusSchema = z.object({
  statusSummary: z.string().min(10, 'Minimum 10 znaków'),
  nextSteps: z.string().optional(),
  blockers: z.string().optional(),
  meetingHappened: z.boolean().default(false),
  meetingOutcome: z.string().optional(),
  categoryRecommendation: z.enum(['keep', 'promote', 'demote', 'close_won', 'close_lost']).default('keep'),
});
```

Props:
- `teamContactId: string`
- `teamId: string`
- `contactName: string`
- `contactCompany: string | null`
- `open: boolean`
- `onClose: () => void`

Logika:
- Sekcja "Wynik spotkania" widoczna tylko gdy `meetingHappened = true`
- Po submit: `useSubmitWeeklyStatus()` z automatycznym `week_start` i `reported_by`
- Błąd UNIQUE → `toast.error("Status na ten tydzień już istnieje")`

### 4. Dialog `src/components/deals-team/PromoteDialog.tsx`

Dialog awansowania LEAD → TOP lub TOP → HOT:

```text
LEAD → TOP wymaga:
├── assigned_to (Select z członków zespołu) *
├── next_action (Input) *
├── next_action_date (DatePicker, opcjonalne)
└── priority (Select, opcjonalne)

TOP → HOT wymaga:
├── next_meeting_date (DatePicker) *
├── next_meeting_with (Select z członków, opcjonalne)
├── estimated_value (Input number, opcjonalne)
└── value_currency (Select PLN/EUR/USD, opcjonalne)
```

Props:
- `contact: DealTeamContact`
- `targetCategory: 'top' | 'hot'`
- `teamId: string`
- `open: boolean`
- `onClose: () => void`

Logika:
- Dynamiczne renderowanie pól w zależności od `targetCategory`
- `useTeamMembers(teamId)` dla selectów członków
- Po submit: `useUpdateTeamContact()` z nowymi polami + zmianą kategorii
- Walidacja: przycisk disabled gdy brak wymaganych pól

### 5. Dialog `src/components/deals-team/ConvertProspectDialog.tsx`

Dialog konwersji prospekta do LEAD z dwoma wariantami:

**Wariant A** (prospect ma `contact_id`):
```text
✅ Kontakt już istnieje w CRM
→ Tylko wybór kategorii docelowej
→ Automatyczne powiązanie
```

**Wariant B** (prospect nie ma `contact_id`):
```text
⚠️ Kontakt nie istnieje w CRM
→ Formularz z pre-filled danymi z prospekta:
  - full_name ← prospect_name
  - company ← prospect_company
  - position ← prospect_position
  - email ← prospect_email
  - phone ← prospect_phone
→ Utwórz kontakt CRM + dodaj do zespołu
```

Props:
- `prospect: DealTeamProspect`
- `teamId: string`
- `open: boolean`
- `onClose: () => void`

Logika:
- Sprawdzenie `prospect.contact_id` decyduje o wariancie
- Wariant A: `useAddContactToTeam()` + `useConvertProspect()`
- Wariant B: INSERT do `contacts` + `useAddContactToTeam()` + `useConvertProspect()`
- Po sukcesie invalidate obu list

## Modyfikacje istniejących plików

### 1. `src/components/deals-team/TopLeadCard.tsx`

Zmiana:
- Dodanie state `showPromoteDialog`
- Import i renderowanie `PromoteDialog`
- Podmiana `handlePromote`:

```typescript
// Było:
const handlePromote = () => toast.info('Wkrótce — prompt 5.8');

// Będzie:
const [showPromote, setShowPromote] = useState(false);
// ... w JSX:
<PromoteDialog
  contact={contact}
  targetCategory="hot"
  teamId={teamId}
  open={showPromote}
  onClose={() => setShowPromote(false)}
/>
```

**Wymaga dodania `teamId` do props komponentu!**

### 2. `src/components/deals-team/LeadCard.tsx`

Analogiczna zmiana jak TopLeadCard:
- State `showPromoteDialog`
- `PromoteDialog` z `targetCategory="top"`
- Props: dodać `teamId`

### 3. `src/components/deals-team/ProspectCard.tsx`

Zmiana:
- Dodanie state `showConvertDialog`
- Import i renderowanie `ConvertProspectDialog`
- Props: dodać `teamId`

### 4. `src/components/deals-team/KanbanBoard.tsx`

Zmiana:
- Przekazanie `teamId` do wszystkich kart:

```typescript
// Było:
<TopLeadCard key={contact.id} contact={contact} />

// Będzie:
<TopLeadCard key={contact.id} contact={contact} teamId={teamId} />
```

### 5. `src/pages/DealsTeamDashboard.tsx`

Zmiany:
- Import `WeeklyStatusPanel`
- State `showWeeklyStatus`
- Przycisk "📊 Statusy" w headerze z badge overdue

```typescript
const overdueCount = contactStats.overdue_count;

// W header:
<Button
  variant="outline"
  onClick={() => setShowWeeklyStatus(true)}
  className="gap-2"
>
  <BarChart3 className="h-4 w-4" />
  Statusy
  {overdueCount > 0 && (
    <Badge variant="destructive" className="text-xs">
      {overdueCount}
    </Badge>
  )}
</Button>

// Na końcu:
<WeeklyStatusPanel
  teamId={selectedTeamId}
  open={showWeeklyStatus}
  onOpenChange={setShowWeeklyStatus}
/>
```

### 6. `src/components/deals-team/index.ts`

Dodanie eksportów:
```typescript
export { WeeklyStatusPanel } from './WeeklyStatusPanel';
export { WeeklyStatusForm } from './WeeklyStatusForm';
export { PromoteDialog } from './PromoteDialog';
export { ConvertProspectDialog } from './ConvertProspectDialog';
```

## Struktura plików (nowe + modyfikowane)

```text
src/
├── hooks/
│   └── useWeeklyStatuses.ts                ← NOWY
└── components/deals-team/
    ├── WeeklyStatusPanel.tsx               ← NOWY
    ├── WeeklyStatusForm.tsx                ← NOWY
    ├── PromoteDialog.tsx                   ← NOWY
    ├── ConvertProspectDialog.tsx           ← NOWY
    ├── TopLeadCard.tsx                     ← MODYFIKACJA (state + dialog + teamId prop)
    ├── LeadCard.tsx                        ← MODYFIKACJA (state + dialog + teamId prop)
    ├── ProspectCard.tsx                    ← MODYFIKACJA (state + dialog + teamId prop)
    ├── KanbanBoard.tsx                     ← MODYFIKACJA (przekazanie teamId do kart)
    └── index.ts                            ← MODYFIKACJA (nowe eksporty)

src/pages/
    └── DealsTeamDashboard.tsx              ← MODYFIKACJA (przycisk statusów + panel)
```

## Przepływ danych

```text
DealsTeamDashboard
├── contactStats.overdue_count → Badge przy przycisku "Statusy"
├── [📊 Statusy] → WeeklyStatusPanel
│   ├── useOverdueContacts → lista wymagających
│   ├── useWeeklyStatuses → lista złożonych
│   └── [Dodaj status →] → WeeklyStatusForm
│       └── useSubmitWeeklyStatus → INSERT
│
└── KanbanBoard (teamId)
    ├── TopLeadCard (contact, teamId)
    │   └── [↑ do HOT] → PromoteDialog
    │       └── useUpdateTeamContact (category='hot' + pola)
    │
    ├── LeadCard (contact, teamId)
    │   └── [↑ do TOP] → PromoteDialog
    │       └── useUpdateTeamContact (category='top' + pola)
    │
    └── ProspectCard (prospect, teamId)
        └── [Konwertuj] → ConvertProspectDialog
            ├── (A) useAddContactToTeam + useConvertProspect
            └── (B) INSERT contacts + useAddContactToTeam + useConvertProspect
```

## Sekcja techniczna

### Komponenty shadcn/ui używane
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` (WeeklyStatusPanel)
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- `Textarea`, `Input`, `Checkbox`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Popover`, `Calendar` (DatePicker)
- `Button`, `Badge`, `ScrollArea`

### Obliczanie week_start
```typescript
import { startOfWeek, format } from 'date-fns';

const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
```

### Walidacja PromoteDialog
```typescript
// LEAD → TOP
const canPromoteToTop = !!assignedTo && !!nextAction;

// TOP → HOT  
const canPromoteToHot = !!nextMeetingDate;
```

### Rozszerzenie useConvertProspect
```typescript
// Dodatkowy parametr: newContactData (opcjonalny)
interface ConvertProspectInput {
  id: string;
  teamId: string;
  newContactData?: {
    full_name: string;
    company?: string;
    email?: string;
    phone?: string;
    position?: string;
  };
}
```

## Guardrails
- NIE modyfikuję istniejącej logiki hooków — tylko dodaję nowy hook `useWeeklyStatuses`
- NIE zmieniam struktury KanbanBoard/KanbanColumn — tylko przekazuję props
- NIE usuwam żadnego kodu z promptu 5.7 — tylko rozszerzam
- WeeklyStatusForm używa react-hook-form + zod (jak ContactModal)
- PromoteDialog: Select z członkami → `useTeamMembers(teamId)`
- DatePicker z `pointer-events-auto` w Calendar (zgodnie z wytycznymi shadcn)
