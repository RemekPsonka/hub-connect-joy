

# B-FIX.15 — Kafelek "Spotkanie odbyte" w drawer AKCJE

## Cel
Dodać 10. kafelek "Spotkanie odbyte" w `ContactActionButtons` (drawer AKCJE w `ContactTasksSheet`). Klik → otwiera `MeetingDecisionDialog`. Zamknięcie taska załatwia trigger DB z HOTFIX-OS3 — bez `updateTask` w FE.

## Pliki dotknięte (2)

### Plik 1: `src/components/deals-team/ContactActionButtons.tsx`

**A. Extend `ActionType`** — dodać `'meeting_done'` po `'meeting_scheduled'`.

**B. Import** — dodać `CheckCircle2` z `lucide-react`.

**C. ACTIONS** — wstaw entry po `meeting_scheduled`:
```tsx
{ value: 'meeting_done', label: 'Spotkanie odbyte', icon: CheckCircle2, needsDate: false,
  isActive: (c) => c.offering_stage === 'meeting_done' },
```

**D. Props** — dodać `onMeetingDone: () => void` do `ContactActionButtonsProps`.

**E. handleClick** — early-return obok `'snooze'` / `'client'`:
```tsx
if (action.value === 'meeting_done') { onMeetingDone(); return; }
```

### Plik 2: `src/components/deals-team/ContactTasksSheet.tsx`

**F. Import**:
```tsx
import { MeetingDecisionDialog } from './MeetingDecisionDialog';
```

**G. State**:
```tsx
const [showMeetingDecision, setShowMeetingDecision] = useState(false);
```

**H. Callback do `<ContactActionButtons>`**:
```tsx
onMeetingDone={() => setShowMeetingDecision(true)}
```

**I. Render dialogu** (obok innych dialogów):
```tsx
{contact.contact_id && (
  <MeetingDecisionDialog
    open={showMeetingDecision}
    onOpenChange={setShowMeetingDecision}
    contactId={contact.contact_id}
    contactDisplayName={contact.contact?.full_name ?? 'kontakt'}
    onSuccess={() => setShowMeetingDecision(false)}
  />
)}
```

## ZERO zmian w
- `MeetingDecisionDialog.tsx` (props sygnatura zgadza się z reconu)
- `useTasks.ts` / `useDealsTeamContacts.ts` (trigger DB załatwia close task)
- Migracjach
- Innych callsite'ach `ContactActionButtons` (jest tylko jeden — `ContactTasksSheet`)

## Pre-flight
1. `grep -n "meeting_done\|MeetingDecisionDialog\|onMeetingDone" src/components/deals-team/ContactActionButtons.tsx src/components/deals-team/ContactTasksSheet.tsx` — oczekiwane: ActionType + ACTIONS + prop + handleClick w pliku 1; import + state + callback + render w pliku 2
2. `npx tsc --noEmit` → 0 nowych errors
3. Lint na 2 zmodyfikowanych plikach → 0 nowych warnings
4. Grep `<ContactActionButtons` w `src/` → tylko 1 hit (`ContactTasksSheet.tsx`) — potwierdza że nie trzeba aktualizować innych callsite'ów

## STOP conditions
- TYLKO 2 pliki tknięte
- Bez `updateTask` w `onSuccess` (trigger HOTFIX-OS3 to robi)
- Bez zmian kolejności pozostałych akcji
- Grid kafelków pozostaje `grid-cols-3` (10 kafelków = 4 wiersze, akceptowalne)
- Zero `console.log`, zero `any`

## Edge cases
| Scenariusz | Zachowanie |
|---|---|
| Kontakt na stage `meeting_scheduled` | Kafelek "Spotkanie odbyte" klikalny, NIE highlighted (highlighted dopiero gdy stage=`meeting_done`) |
| Kontakt poza workflow spotkań | Kafelek klikalny — user może manualnie zgłosić odbyte spotkanie. Akceptowalne. |
| `contact.contact_id` null | Render dialogu z guardem `{contact.contact_id && ...}` — dialog nie renderuje się, kafelek nadal klikalny ale `setShowMeetingDecision(true)` no-op'uje wizualnie |
| Cancel w dialogu | Dialog zamknięty, żaden zapis |
| Decyzja zapisana | `onSuccess` zamyka dialog; trigger DB N-apply: `offering_stage`, `k1_meeting_done_at`, `next_action_date`, ewentualny `is_lost`; trigger HOTFIX-OS3: zamyka aktywne taski kontaktu |

## Raport po execute
1. Diff obu plików (~+15/-0 łącznie)
2. Pre-flight #1-#4 wyniki
3. Manual smoke (user): Pawełczyk → AKCJE drawer → "Spotkanie odbyte" → dialog → "Idziemy" + data → Zapisz → kontakt do Ofertowanie + active task zamknięty

## Backlog (nie ten sprint)
- **B-FIX.16** — UX: highlight wizualny gdy active task = "spotkanie K1" (sugestia że "Spotkanie odbyte" to logiczny next step)
- **B-FIX.17** — Memory cleanup: `project_meeting_decision_application_gap.md` → "DOMKNIĘTY przez 3 entry points: kanban icon ✓ + TaskDetailSheet dropdown + ContactActionButtons kafelek"

