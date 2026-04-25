/**
 * Centralna mapa: offering_stage → akcja w UI + dialog + następny etap.
 * Pojedyncze źródło prawdy dla `/sgu/zadania`, `ContactActionButtons`,
 * triggera `ensure_active_task_per_lead` i ghost-rows.
 *
 * Kolejność etapów (uzgodniona z Remkiem 2026-04):
 *   meeting_plan → meeting_scheduled → meeting_done → handshake
 *   → power_of_attorney → audit_scheduled → audit_done → won
 */

export type SguStage =
  | 'meeting_plan'
  | 'meeting_scheduled'
  | 'meeting_done'
  | 'handshake'
  | 'power_of_attorney'
  | 'audit_scheduled'
  | 'audit_done'
  | 'won';

export type SguDialog =
  | 'meeting_scheduled'
  | 'meeting_outcome'
  | 'next_action'
  | 'estimated_premium'
  | 'poa_signed'
  | 'audit_schedule'
  | 'audit_done'
  | 'send_offer'
  | 'convert_to_client';

export interface StageAction {
  /** Tytuł zadania bez nazwiska — np. "Umówić spotkanie". */
  taskTitleBase: string;
  /** Krótki label akcji w wierszu zadania. */
  buttonLabel: string;
  /** Nazwa ikony lucide-react (komponent rezolwowany w UI). */
  icon: 'CalendarIcon' | 'CheckCircle2' | 'ArrowRight' | 'Banknote'
      | 'Handshake' | 'ClipboardCheck' | 'FileText' | 'UserCheck';
  /** Który dialog otwiera klik. */
  dialog: SguDialog;
  /** Domyślny `offering_stage` po sukcesie. Dialog może go nadpisać. */
  nextStage: SguStage | null;
}

export const STAGE_ACTIONS: Record<SguStage, StageAction> = {
  meeting_plan: {
    taskTitleBase: 'Umówić spotkanie',
    buttonLabel: 'Umów spotkanie',
    icon: 'CalendarIcon',
    dialog: 'meeting_scheduled',
    nextStage: 'meeting_scheduled',
  },
  meeting_scheduled: {
    taskTitleBase: 'Spotkanie',
    buttonLabel: 'Spotkanie odbyte',
    icon: 'CheckCircle2',
    dialog: 'meeting_outcome',
    nextStage: 'meeting_done',
  },
  meeting_done: {
    taskTitleBase: 'Decyzja po spotkaniu',
    buttonLabel: 'Co dalej?',
    icon: 'ArrowRight',
    dialog: 'next_action',
    nextStage: null, // wybór dialogu
  },
  handshake: {
    taskTitleBase: 'Wpisać oczekiwane składki',
    buttonLabel: 'Wpisz składki',
    icon: 'Banknote',
    dialog: 'estimated_premium',
    nextStage: 'power_of_attorney',
  },
  power_of_attorney: {
    taskTitleBase: 'Pełnomocnictwo',
    buttonLabel: 'Podpisane',
    icon: 'Handshake',
    dialog: 'poa_signed',
    nextStage: 'audit_scheduled',
  },
  audit_scheduled: {
    taskTitleBase: 'Umówić audyt',
    buttonLabel: 'Ustaw datę audytu',
    icon: 'ClipboardCheck',
    dialog: 'audit_schedule',
    nextStage: 'audit_done',
  },
  audit_done: {
    taskTitleBase: 'Aktualizacja składek po audycie',
    buttonLabel: 'Wyślij ofertę',
    icon: 'FileText',
    dialog: 'send_offer',
    nextStage: 'won',
  },
  won: {
    taskTitleBase: 'Podpisanie polisy',
    buttonLabel: 'Konwertuj na klienta',
    icon: 'UserCheck',
    dialog: 'convert_to_client',
    nextStage: null,
  },
};

/** Format tytułu zadania: "Umówić spotkanie — Adam Papiernik (Acme sp. z o.o.)". */
export function buildTaskTitle(
  stage: SguStage,
  contactName: string | null | undefined,
  company?: string | null,
): string {
  const action = STAGE_ACTIONS[stage];
  const base = action?.taskTitleBase ?? 'Działanie';
  const name = (contactName || '').trim() || 'Kontakt';
  const co = (company || '').trim();
  return co ? `${base} — ${name} (${co})` : `${base} — ${name}`;
}

/** Zwraca etap dla danego task.contact_offering_stage albo null jeśli nie obsługiwany. */
export function asSguStage(value: string | null | undefined): SguStage | null {
  if (!value) return null;
  return (value in STAGE_ACTIONS) ? (value as SguStage) : null;
}
