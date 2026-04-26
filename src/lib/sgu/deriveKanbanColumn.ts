import type { DealTeamContact, DealStage } from '@/types/dealTeam';

/**
 * Sprint S6.5 — 5-kolumnowy Kanban (RFC werdykt 2026-04-25).
 * Klient (won_at NOT NULL lub category='client') NIE pokazuje się w Kanbanie —
 * operator widzi go w /sgu/klienci. Lost (is_lost=true) również znika.
 *
 * Pre-Etap 5 mapping: używa obecnych pól (offering_stage, k1_meeting_done_at,
 * poa_signed_at, won_at, is_lost, next_meeting_date). Po Etap 5 helper przejdzie
 * na M1–M5 markery (osobny sprint).
 */
export type KanbanColumn = 'prospect' | 'cold' | 'lead' | 'top' | 'hot';

export const KANBAN_COLUMN_ORDER: KanbanColumn[] = ['prospect', 'cold', 'lead', 'top', 'hot'];

export const KANBAN_COLUMN_LABELS: Record<KanbanColumn, string> = {
  prospect: 'Prospekt',
  cold: 'Cold',
  lead: 'Lead',
  top: 'Top',
  hot: 'Hot',
};

export const KANBAN_COLUMN_ICONS: Record<KanbanColumn, string> = {
  prospect: '🔍',
  cold: '❄️',
  lead: '🎯',
  top: '🤝',
  hot: '🔥',
};

export const KANBAN_COLUMN_BORDER: Record<KanbanColumn, string> = {
  prospect: 'border-t-slate-400',
  cold: 'border-t-sky-500',
  lead: 'border-t-amber-500',
  top: 'border-t-orange-500',
  hot: 'border-t-red-500',
};

/**
 * Mapowanie KanbanColumn → DealStage używane jako prop `stage` dla
 * `UnifiedKanbanCard` (decyduje o tym, który sub-chip jest renderowany).
 * - prospect → 'prospect' (badge: prospect_source)
 * - cold/lead/top → 'lead' (badge: temperature)
 * - hot → 'offering' (badge: offering_stage)
 */
export function kanbanColumnToCardStage(col: KanbanColumn): DealStage {
  if (col === 'prospect') return 'prospect';
  if (col === 'hot') return 'offering';
  return 'lead';
}

export function deriveKanbanColumn(dtc: DealTeamContact): KanbanColumn | null {
  if (dtc.is_lost) return null;
  if (dtc.category === 'client' || dtc.won_at) return null;
  if (dtc.category === 'prospect') return 'prospect';
  if (dtc.poa_signed_at) return 'hot';
  if (
    dtc.k1_meeting_done_at ||
    dtc.offering_stage === 'meeting_done' ||
    dtc.offering_stage === 'handshake'
  ) {
    return 'top';
  }
  if (dtc.next_meeting_date || dtc.offering_stage === 'meeting_scheduled') {
    return 'lead';
  }
  if (dtc.category === 'lead') return 'cold';
  return null;
}