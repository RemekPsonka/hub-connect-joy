

# B-FIX.6 — Reorganizacja kafelek SalesHeader

## Zmiany w `src/components/sgu/headers/SalesHeader.tsx`

1. **Usuń kafelek "Zaległe"** (`overdue`) — wraz z hookiem `useSGUTasks('overdue')` i kluczem w typach `onCardClick`/`activeKey`.
2. **Zastąp kafelek "Dziś" kafelkiem "Odłożone"**:
   - Usuń `useSGUTasks('today')`.
   - Dodaj liczenie odłożonych: `visibleContacts` filtrowane już wyklucza snoozed; potrzebujemy osobnej listy `snoozedContacts = contacts.filter(c => !c.is_lost && c.snoozed_until && c.snoozed_until >= nowIso)`.
   - Nowy kafelek: `key: 'snoozed'`, `label: 'Odłożone'`, ikona `Moon` (lucide-react), tone `text-indigo-600`.
3. **Zaktualizuj typy propsów**: `onCardClick`/`activeKey` → `'prospect' | 'lead' | 'offering' | 'snoozed'`.
4. Grid zmienia się z `md:grid-cols-5` → `md:grid-cols-4`.

## Zmiany w callerze (consumer SalesHeader)

Plik: `src/pages/sgu/SGUSprzedaz.tsx` (lub gdzie `SalesHeader` jest renderowany — zweryfikuję podczas implementacji).

- Stan `activeKey` i handler `onCardClick`: usuń obsługę `'today'` i `'overdue'`, dodaj `'snoozed'`.
- Klik w "Odłożone" → przewija/otwiera istniejący `SnoozedContactsBar` (np. scroll do paska + auto-expand). Jeśli `SnoozedContactsBar` nie ma propa `defaultOpen`/`expanded` — dodam minimalny prop kontrolujący stan otwarcia.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/headers/SalesHeader.tsx` | EDIT — usunięcie Dziś/Zaległe, dodanie Odłożone |
| 2 | Strona `/sgu/sprzedaz` (consumer) | EDIT — handler klików + scroll do `SnoozedContactsBar` |
| 3 | `src/components/deals-team/SnoozedContactsBar.tsx` | EDIT (opcj.) — kontrolowany `expanded` jeśli potrzebny do auto-otwarcia |

## Poza zakresem

- Zmiany w logice cron/edge function `return-snoozed-contacts`.
- Modyfikacje breakdown HOT/TOP/10x/COLD (zostają na Prospekci/Leady/Ofertowanie).
- Przenoszenie liczników "Dziś"/"Zaległe" w inne miejsce (znikają — są dostępne w module Zadania).

## DoD

| Check | Stan |
|---|---|
| Header pokazuje 4 kafelki: Prospekci, Leady, Ofertowanie, Odłożone | ⬜ |
| Liczba w "Odłożone" = liczba kart w `SnoozedContactsBar` | ⬜ |
| Klik "Odłożone" rozwija/scrolluje do paska odłożonych | ⬜ |
| Brak hooków `useSGUTasks('today'|'overdue')` w SalesHeader | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

