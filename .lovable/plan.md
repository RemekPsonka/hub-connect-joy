# Sprint S6.5 — Restrukturyzacja Kanbana 3 → 5 kolumn

## Kontekst
Po werdykcie cofamy 3-kolumnowy DnD z S7 i przebudowujemy `UnifiedKanban` na 5 kolumn (Prospekt / Cold / Lead / Top / Hot). Klient i Lost znikają z Kanbana. DnD wraca w kolejnym sprincie (S7-v2) — w S6.5 tylko struktura + rendering.

## Pre-flight (potwierdzone)
- **A.** `UnifiedKanban.tsx` (970 linii) ma 3 kolumny `COLUMNS = [prospect, lead, offering]` (linie 71+).
- **B.** Brak istniejącego helpera `deriveKanbanColumn` / `kanbanColumn` w `src/`.
- **C.** Sub-grouping po `temperature` (lead) i `offering_stage` (offering) renderowany inline w kolumnach.
- **D.** `UnifiedKanbanCard` ma stabilne props (potwierdzone — bez zmian).
- **Uwaga:** w `DealTeamContact` NIE ma pola `meeting_scheduled_at`; jedyne dostępne to `next_meeting_date`. Helper w briefie wymaga korekty (patrz niżej).

## Krok 1 — Rollback fragmentów S7 z `UnifiedKanban.tsx`
Usuwam:
- State `scheduleMeetingContact` i `signPoaContact` (linie ~551–552).
- Stałą `COLUMN_ORDER: DealStage[] = [...]` (linia 706).
- Pełne ciało `handleDragEnd` (linia 708+) → zamienione na **pusty stub** `function handleDragEnd(_: DragEndEvent) { /* DnD wraca w S7-v2 */ }`.
- Mount `<ScheduleMeetingDialog>` i `<SignPoaDialog>` w JSX (linie ~948–966).
- Importy `ScheduleMeetingDialog` i `SignPoaDialog` (nieużywane po rollbacku).

Zachowuję pliki:
- `src/components/sgu/sales/ScheduleMeetingDialog.tsx`
- `src/components/sgu/sales/SignPoaDialog.tsx`

Zachowuję `handleOfferingStageChange` (sub-chip handler dla offering_stage). Po restructure offering jako kolumna znika, ale sub-chip `offering_stage` pozostaje renderowany w kolumnie **Hot** (badge), więc handler trafia teraz do `UnifiedKanbanCard` w kolumnie Hot.

## Krok 2 — Nowy helper `src/lib/sgu/deriveKanbanColumn.ts`
```ts
import type { DealTeamContact } from '@/types/dealTeam';

export type KanbanColumn = 'prospect' | 'cold' | 'lead' | 'top' | 'hot';

export const KANBAN_COLUMN_ORDER: KanbanColumn[] = ['prospect', 'cold', 'lead', 'top', 'hot'];
export const KANBAN_COLUMN_LABELS: Record<KanbanColumn, string> = {
  prospect: 'Prospekt', cold: 'Cold', lead: 'Lead', top: 'Top', hot: 'Hot',
};

export function deriveKanbanColumn(dtc: DealTeamContact): KanbanColumn | null {
  if (dtc.is_lost) return null;
  if (dtc.category === 'client' || dtc.won_at) return null; // /sgu/klienci
  if (dtc.category === 'prospect') return 'prospect';
  if (dtc.poa_signed_at) return 'hot';
  if (
    dtc.k1_meeting_done_at ||
    dtc.offering_stage === 'meeting_done' ||
    dtc.offering_stage === 'handshake'
  ) return 'top';
  if (
    dtc.next_meeting_date ||
    dtc.offering_stage === 'meeting_scheduled'
  ) return 'lead';
  if (dtc.category === 'lead') return 'cold';
  return null;
}
```
Korekta vs brief: zamiast `meeting_scheduled_at` (nie istnieje) → `next_meeting_date` (jedyny istniejący marker zaplanowanego spotkania).

## Krok 3 — Refactor `UnifiedKanban.tsx`
- Usuwam stałą `COLUMNS` (3 kolumny prospect/lead/offering).
- Usuwam sub-grouping po `temperature` w lead i po `offering_stage` w offering (rendering grupowy).
- Importuję `KANBAN_COLUMN_ORDER`, `KANBAN_COLUMN_LABELS`, `deriveKanbanColumn`, `KanbanColumn`.
- `groupedContacts` = `useMemo` mapujące `contacts` przez `deriveKanbanColumn`, NULL = pomijane.
- Render 5 kolumn w pętli `KANBAN_COLUMN_ORDER.map(...)`: header (label + count) + lista `<UnifiedKanbanCard>`.
- `UnifiedKanbanCard` props bez zmian — sub-chips temperature / offering_stage / source / client_status pozostają na karcie (read-only w S6.5, akcje sub-chip pozostają jak były wcześniej, ale dla offering_stage handshake→POA dialog wraca w S7-v2; w S6.5 może wywołać istniejący flow lub być no-op — zachowuję istniejący `handleOfferingStageChange` bez podpięcia do `SignPoaDialog`).
- Prop `filter` (`'prospect'|'lead'|'offering'|'client'`) — mapuję na nowe kolumny:
  - `prospect` → kolumna `prospect`
  - `lead` → kolumny `cold` + `lead`
  - `offering` → kolumny `top` + `hot`
  - `client` → puste (klienci są w /sgu/klienci)
  Implementacja: po `groupedContacts`, jeśli `filter` ustawiony, renderuję tylko podzbiór kolumn.

## Krok 4 — Brak migracji
Wszystkie pola istnieją (`category`, `offering_stage`, `k1_meeting_done_at`, `poa_signed_at`, `won_at`, `is_lost`, `next_meeting_date`).

## Pliki
- **Nowy:** `src/lib/sgu/deriveKanbanColumn.ts`
- **Edytowany:** `src/components/sgu/sales/UnifiedKanban.tsx` (rollback S7 + restructure 3→5)
- **Bez zmian (zachowane):** `ScheduleMeetingDialog.tsx`, `SignPoaDialog.tsx`, `UnifiedKanbanCard.tsx`, `useSguStageTransition`, dialogi MeetingDecision/WonPremium/MeetingOutcome.

## Walidacja
- `npx tsc --noEmit` clean.
- `npm run lint` clean (usunąć nieużywane importy).
- Smoke (preview): kontakt z `next_meeting_date` → Lead; po `k1_meeting_done_at` → Top; po `poa_signed_at` → Hot; `won_at` lub `is_lost=true` → znika z Kanbana.
- DnD nie działa (świadomie) — przywrócony w S7-v2.
