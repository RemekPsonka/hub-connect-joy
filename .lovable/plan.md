

# Klik w kartę kanbana → karta kontaktu z zakładką "Zadania"

## Problem

Obecnie klik w kartę na kanbanie (`/sgu/sprzedaz`) otwiera `ContactTasksSheet` (boczny panel z zadaniami). User chce, żeby zamiast tego otwierała się **pełna karta kontaktu** (strona `/contacts/:id`) z domyślnie aktywną zakładką **Zadania**.

## Recon

**`src/components/sgu/sales/UnifiedKanban.tsx`** — handler kliknięcia karty:
- State: `selectedContact` + render `<ContactTasksSheet contact={selectedContact} ... />`
- `UnifiedKanbanCard` przyjmuje `onClick={() => setSelectedContact(c)}`

**`src/pages/ContactDetail.tsx`** (lub równoważna strona karty kontaktu) — przyjmuje `:id` w URL i renderuje tabsy: Info / Zadania / Notatki / Emaile / BI / etc.

**Wzorzec już użyty w projekcie:** kilka miejsc nawiguje do karty kontaktu z `?tab=...` query paramem (np. `ContactTasksSheet` ma link "Otwórz pełną kartę"). Trzeba potwierdzić w execute exact param name (`?tab=tasks` vs `?tab=zadania`).

## Zmiany

**1 plik dotknięty:** `src/components/sgu/sales/UnifiedKanban.tsx`

### Krok 1: Zamień handler `onClick` karty
```tsx
import { useNavigate } from 'react-router-dom';
// ...
const navigate = useNavigate();
// ...
<UnifiedKanbanCard
  ...
  onClick={() => {
    if (c.contact_id) {
      navigate(`/contacts/${c.contact_id}?tab=tasks`);
    }
  }}
/>
```

### Krok 2: Usuń `ContactTasksSheet` z drzewa kanbana
- Usuń state `selectedContact` + `setSelectedContact`
- Usuń `<ContactTasksSheet ... />` render
- Usuń import `ContactTasksSheet` jeśli niepotrzebny gdzie indziej w tym pliku

### Krok 3 (recon w execute): Potwierdź exact tab key
- Sprawdź `src/pages/ContactDetail.tsx` (lub odpowiednik) — czy czyta `searchParams.get('tab')` i jaką wartością mapuje na zakładkę "Zadania" (`tasks`, `zadania`, `tasks-tab`?)
- Użyj exact value w `navigate(...)` URL

## STOP conditions
- TYLKO 1 plik tknięty (`UnifiedKanban.tsx`)
- Zero zmian w `ContactTasksSheet.tsx` (komponent zostaje — może być używany gdzie indziej, np. w `ClientsTab.tsx`)
- Zero zmian w routach
- Zero zmian w karcie kontaktu (poza recon czytania `?tab=` jeśli już istnieje — jeśli NIE istnieje, dodanie tej obsługi wpada do osobnego sprintu B-FIX.16)
- TS clean, lint clean

## Pre-flight
1. `grep -n "ContactTasksSheet" src/components/sgu/sales/UnifiedKanban.tsx` → 0 hits po zmianie
2. `grep -n "useNavigate" src/components/sgu/sales/UnifiedKanban.tsx` → 1+ hits
3. `grep -rn "searchParams.get('tab')" src/pages/` → potwierdza że karta kontaktu czyta tab param
4. `npx tsc --noEmit` → 0 nowych errors
5. `ContactTasksSheet` używany w `ClientsTab.tsx` → bez zmian

## Edge cases
| Scenariusz | Zachowanie |
|---|---|
| `c.contact_id` null | `onClick` no-op (guard) — karta bez kontaktu nie nawiguje |
| Karta kontaktu nie ma tab "Zadania" | Otworzy się domyślny tab (Info) — graceful fallback |
| User zostaje na `/sgu/sprzedaz` w innych przypadkach | Akcje na karcie (`...` menu, ikona ✓ meeting decision, drag) działają jak wcześniej |

## Raport po execute
1. Diff `UnifiedKanban.tsx` (~+5/-15 linii)
2. Pre-flight #1-#5 wyniki
3. Confirm: route `/contacts/:id?tab=tasks` istnieje i otwiera zakładkę Zadania (recon w execute)
4. Manual smoke: `/sgu/sprzedaz` → klik dowolna karta kontaktu → przejście na `/contacts/<id>?tab=tasks` z aktywną zakładką "Zadania"

## Backlog (osobne sprinty)
- **B-FIX.16** — Jeśli karta kontaktu NIE czyta `?tab=` z URL, dodać tę obsługę (Tabs `value` controlled by searchParam)
- **B-FIX.17** — Decyzja: czy `ContactTasksSheet` jest jeszcze potrzebny? Jeśli `ClientsTab.tsx` to jedyny consumer i też się migruje na nawigację do karty → usuń komponent

