

# REVERT-NAV-2 — Klik w KORPUS karty kanbana otwiera drawer (zamiast `/sgu/klienci`)

## Problem

REVERT-NAV-1 podpiął drawer pod handlery `onMoreClick` w `UnifiedKanban.tsx` (parent), ale **`UnifiedKanbanCard.tsx` ma własny `onClick` na korpusie `<Card>`**, który nawiguje do `/sgu/klienci?contactId=...`. Większość kliknięć usera (w nazwisko, firmę, puste miejsce karty) trafia w ten handler — drawer nigdy się nie otwiera, user ląduje w "Klienci".

## Recon

**`src/components/sgu/sales/UnifiedKanbanCard.tsx`** — linie 71-77:
```tsx
const handleCardClick = () => {
  navigate(`/sgu/klienci?contactId=${contact.contact_id}`);
};

return <Card onClick={handleCardClick} ...>
```

Wszystkie wewnętrzne strefy interaktywne (footer, status pill, mini-banner, AssigneeAvatars, badges) już mają `e.stopPropagation()` i wołają `onMoreClick` — więc po naprawie korpus karty ma się zachować TAK SAMO jak te elementy: otwierać drawer.

`onMoreClick` jest już propsem komponentu (linia 28), przekazywanym z parenta jako `setSheetContact(c)`. Wystarczy go wywołać z korpusu zamiast `navigate(...)`.

## Zmiana — 1 plik

**`src/components/sgu/sales/UnifiedKanbanCard.tsx`**

### Krok 1: Usuń `useNavigate` (niewykorzystywany po zmianie)
```tsx
// USUŃ:
import { useNavigate } from 'react-router-dom';
// USUŃ:
const navigate = useNavigate();
```

### Krok 2: Zamień `handleCardClick` na wywołanie `onMoreClick`
```tsx
const handleCardClick = () => {
  onMoreClick();
};
```

(albo bezpośrednio `onClick={onMoreClick}` na `<Card>` — wybór stylistyczny w execute)

## ZERO zmian w
- `UnifiedKanban.tsx` (REVERT-NAV-1 już prawidłowy — parent dobrze przekazuje `setSheetContact`)
- `ContactTasksSheet.tsx`
- `ContactActionButtons.tsx` (B-FIX.15 OK)
- `ContactDetail.tsx` (deep-link `?tab=more&sub=tasks-full` zostaje na przyszłość)
- Routach, migracjach, `SnoozedContactsBar`

## Pre-flight
1. `grep -n "useNavigate\|navigate(" src/components/sgu/sales/UnifiedKanbanCard.tsx` → 0 hits po zmianie
2. `grep -n "onMoreClick" src/components/sgu/sales/UnifiedKanbanCard.tsx` → ≥4 hits (footer, pill, banner, AssigneeAvatars + nowy w handleCardClick)
3. `npx tsc --noEmit` → 0 nowych errors
4. Lint zmodyfikowanego pliku → 0 nowych warnings

## STOP conditions
- TYLKO 1 plik tknięty (`UnifiedKanbanCard.tsx`)
- Zachowanie po zmianie: klik w **dowolne miejsce karty** (korpus, footer ⋯, status pill, mini-banner, avatar +) → `ContactTasksSheet` (drawer z prawej)
- Drag karty nadal działa (korpus karty jest też drag-handle z `useDraggable` w parencie — `dnd-kit` z `activationConstraint.distance: 6` rozpoznaje drag vs click)
- Klik w ✓ (Spotkanie odbyte) → `MeetingDecisionDialog` (bez zmian)
- Klik w ✕ (Lost) → `LostReasonDialog` (bez zmian)

## Edge cases
| Scenariusz | Zachowanie |
|---|---|
| `c.contact_id` null | `onMoreClick` → `setSheetContact(c)` → drawer otwiera się z dostępnymi polami `DealTeamContact` (graceful) |
| User chce pełną kartę kontaktu | Link "Otwórz pełną kartę" w `ContactTasksSheet` (już istnieje) |
| Drag nad inną kolumnę | dnd-kit pochłania pointer events, `onClick` nie odpala (już działa) |
| Klik w badges (Temperature/Source/Stage) | Mają własny `e.stopPropagation()` → otwierają popovery edycji, nie drawer |

## Raport po execute
1. Diff `UnifiedKanbanCard.tsx` (~+1/-3 linie: usunięcie importu + zmiana 1 linii w handleCardClick)
2. Pre-flight #1-#4 wyniki
3. Manual smoke (user): `/sgu/sprzedaz` → klik w nazwisko Pawełczyka (środek karty) → drawer z prawej (NIE `/sgu/klienci`) → sekcja "Akcje" → "Spotkanie odbyte" widoczne

## Backlog (osobne sprinty)
- **B-FIX.18** — Decyzja UX: czy w drawerze dodać prominent "Otwórz pełną kartę → Zadania" (deep-link `?tab=more&sub=tasks-full` jest już gotowy w `ContactDetail.tsx`)
- **B-FIX.19** — Audit innych kanban-cards w projekcie (KanbanBoard, ClientsTab) czy mają ten sam pattern `onClick={() => navigate(...)}` na korpusie

