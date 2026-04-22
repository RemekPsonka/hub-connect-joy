

# REVERT-NAV-1 — Klik w kafelek kanbana otwiera drawer AKCJE (ContactTasksSheet)

## Problem

Poprzedni patch (klik karty → `/contacts/:id?tab=more&sub=tasks-full`) okazał się błędny UX-owo. User chce wrócić do oryginalnego zachowania:

**Klik w kafelek kanbana → `ContactTasksSheet` (boczny drawer)** — który zawiera sekcję **Akcje** z 10 kafelkami (`ContactActionButtons`, w tym świeży "Spotkanie odbyte" z B-FIX.15).

Nawigacja do pełnej karty kontaktu pozostaje dostępna z poziomu `ContactTasksSheet` (link "Otwórz pełną kartę" już tam jest).

## Recon (potwierdzone)

- `ContactTasksSheet` istnieje i nadal jest używany w `ClientsTab.tsx` + `KanbanBoard.tsx` — komponent żywy, wystarczy go z powrotem podpiąć w kanbanie.
- `ContactTasksSheet` w sekcji "Akcje" (linia 233-239) renderuje `<ContactActionButtons ... />` z pełnym setem 10 akcji, w tym `meeting_done` (B-FIX.15).
- `UnifiedKanbanCard` przyjmuje propsy `onMoreClick: () => void` (footer ⋯ + status pill + button "Add task") i `onContactClick` w `SnoozedContactsBar`.

## Zmiany — 1 plik

`src/components/sgu/sales/UnifiedKanban.tsx`

### Krok 1: Przywróć import + state
```tsx
import { ContactTasksSheet } from '@/components/deals-team/ContactTasksSheet';
// ...
const [sheetContact, setSheetContact] = useState<DealTeamContact | null>(null);
```

### Krok 2: Zamień handler `onMoreClick` (kafelek) z navigate na setSheetContact
```tsx
onMoreClick={() => setSheetContact(c)}
```

### Krok 3: Zamień handler `onContactClick` w `SnoozedContactsBar` z navigate na setSheetContact
```tsx
onContactClick={(c) => setSheetContact(c)}
```

### Krok 4: Render `<ContactTasksSheet>` (przed `</DndContext>` lub w drzewie tam gdzie był wcześniej)
```tsx
<ContactTasksSheet
  contact={sheetContact}
  teamId={teamId}
  open={!!sheetContact}
  onOpenChange={(open) => !open && setSheetContact(null)}
/>
```

### Krok 5: Usuń `useNavigate` jeśli niewykorzystywany w innych miejscach pliku
- Sprawdzić w execute: jeśli `navigate(...)` nie jest używany nigdzie indziej w tym pliku, usunąć import i deklarację.

## ZERO zmian w
- `ContactTasksSheet.tsx` (tylko consumer)
- `ContactActionButtons.tsx` (B-FIX.15 z 10. kafelkiem już wdrożony)
- `ContactDetail.tsx` — whitelist `more` + `getDefaultSubTab()` z poprzedniego patcha **zostaje** (nie szkodzi, przyda się do ewentualnych deep-linków z innych miejsc np. emaili/Sovry)
- Routach, migracjach, innych komponentach kanbana

## Pre-flight
1. `grep -n "ContactTasksSheet\|setSheetContact\|sheetContact" src/components/sgu/sales/UnifiedKanban.tsx` → import + state declare/setter + render + 2 handlery (≥6 hits)
2. `grep -n "navigate(" src/components/sgu/sales/UnifiedKanban.tsx` → 0 hits (lub tylko niezwiązane z klikiem karty); usuń `useNavigate` jeśli pusto
3. `npx tsc --noEmit` → 0 nowych errors
4. Lint zmodyfikowanego pliku → 0 nowych warnings

## STOP conditions
- TYLKO 1 plik tknięty (`UnifiedKanban.tsx`)
- Bez zmian w `ContactTasksSheet`, `ContactActionButtons`, `ContactDetail.tsx`
- Klik karty (footer ⋯, status pill, "Add task") oraz klik w `SnoozedContactsBar` → `ContactTasksSheet` (drawer z prawej)
- W drawer dostępna sekcja "Akcje" z 10 kafelkami, w tym "Spotkanie odbyte" → otwiera `MeetingDecisionDialog`

## Edge cases
| Scenariusz | Zachowanie |
|---|---|
| `c.contact_id` null | Drawer otwiera się z dostępnymi danymi (DealTeamContact ma własne pola) — ContactActionButtons działa, sekcje wymagające `contact_id` graceful-fallback (już zaimplementowane) |
| User chce pełną kartę | Link "Otwórz pełną kartę" w `ContactTasksSheet` (już istnieje) → `/contacts/:id` |
| Drag karty | Bez zmian — drag handle nie odpala onMoreClick (`stopPropagation`) |

## Raport po execute
1. Diff `UnifiedKanban.tsx` (~+10/-5)
2. Pre-flight #1-#4 wyniki
3. Manual smoke: `/sgu/sprzedaz` → klik kafelek Pawełczyka → drawer z prawej → sekcja "Akcje" → kafelek "Spotkanie odbyte" widoczny → klik → `MeetingDecisionDialog` otwarty

## Backlog (nie ten sprint)
- **B-FIX.18** — Decyzja UX: czy w drawerze dodać prominent "Otwórz pełną kartę → Zadania" button (jeśli user często chce trafić do listy wszystkich tasków kontaktu). Na razie linkuje do default tab.

