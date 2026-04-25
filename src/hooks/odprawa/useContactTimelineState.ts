import { useMemo } from 'react';
import type { DealTeamContact } from '@/types/dealTeam';
import {
  OFFERING_STAGE_LABEL,
  PRE_K1_SUBSTAGES,
  PRE_K3_SUBSTAGES,
  POST_K3_SUBSTAGES,
  type OfferingStage,
} from '@/lib/offeringStageLabels';

export type MilestoneKey = 'prospect' | 'k1' | 'k2' | 'k2+' | 'k3' | 'k4';
export type DecisionKey = 'push' | 'pivot' | 'park' | 'kill' | 'klient';
export type StalledColor = 'green' | 'amber' | 'red';

export interface MilestoneState {
  key: MilestoneKey;
  label: string;
  achieved: boolean;
  date: string | null;
}

export interface ContactTimelineState {
  milestones: MilestoneState[];
  currentMilestone: MilestoneKey;
  nextMilestone: MilestoneKey | null;
  stalledDays: number;
  stalledColor: StalledColor;
  isParked: boolean;
  parkedUntil: string | null;
  isLost: boolean;
  lostReason: string | null;
  isWon: boolean;
  wonAt: string | null;
  temperature: string | null;
  /** Nieosiągnięte milestone'y w kolejności lejka. K4 dopiero po K3. Pusta dla zamkniętych. */
  availableMilestones: MilestoneKey[];
  /** Pre-fill dla "+ Stwórz zadanie" — tytuł zadania per current stage + docelowy milestone. */
  nextStepSuggestion: { title: string; stageKey: MilestoneKey | null };
  /** Aktualny offering_stage (sub-stage lub milestone-stage) — surowy. */
  currentOfferingStage: OfferingStage | null;
  /** Polski label aktualnego offering_stage. */
  currentOfferingStageLabel: string;
  /** Sub-stages dostępne do kliknięcia per kontekst (bez aktualnego). */
  availableSubStages: OfferingStage[];
  /** Czy renderować pasek sub-stage pod osią. */
  showSubStageStrip: boolean;
}

const NEXT_MAP: Record<MilestoneKey, MilestoneKey | null> = {
  prospect: 'k1',
  k1: 'k2',
  k2: 'k2+',
  'k2+': 'k3',
  k3: 'k4',
  k4: null,
};

function diffDays(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function colorForDays(days: number): StalledColor {
  if (days <= 3) return 'green';
  if (days <= 14) return 'amber';
  return 'red';
}

export function useContactTimelineState(
  contact:
    | (Pick<
        DealTeamContact,
        | 'created_at'
        | 'updated_at'
        | 'k1_meeting_done_at'
        | 'handshake_at'
        | 'poa_signed_at'
        | 'audit_done_at'
        | 'won_at'
        | 'lost_at'
        | 'is_lost'
        | 'lost_reason'
        | 'snoozed_until'
        | 'temperature'
        | 'offering_stage'
      > & {
        contact?: { full_name?: string | null; company?: string | null } | null;
      })
    | null
    | undefined,
): ContactTimelineState | null {
  return useMemo(() => {
    if (!contact) return null;

    const milestones: MilestoneState[] = [
      { key: 'prospect', label: 'Prospekt', achieved: true, date: contact.created_at ?? null },
      { key: 'k1', label: 'K1 Spotkanie', achieved: !!contact.k1_meeting_done_at, date: contact.k1_meeting_done_at ?? null },
      { key: 'k2', label: 'K2 Handshake', achieved: !!contact.handshake_at, date: contact.handshake_at ?? null },
      { key: 'k2+', label: 'K2+ Pełnomocnictwo', achieved: !!contact.poa_signed_at, date: contact.poa_signed_at ?? null },
      { key: 'k3', label: 'K3 Audyt', achieved: !!contact.audit_done_at, date: contact.audit_done_at ?? null },
      { key: 'k4', label: 'K4 Polisa wygrana', achieved: !!contact.won_at, date: contact.won_at ?? null },
    ];

    let currentMilestone: MilestoneKey = 'prospect';
    if (contact.won_at) currentMilestone = 'k4';
    else if (contact.audit_done_at) currentMilestone = 'k3';
    else if (contact.poa_signed_at) currentMilestone = 'k2+';
    else if (contact.handshake_at) currentMilestone = 'k2';
    else if (contact.k1_meeting_done_at) currentMilestone = 'k1';

    const nextMilestone = NEXT_MAP[currentMilestone];

    const lastTouch =
      contact.won_at ??
      contact.audit_done_at ??
      contact.poa_signed_at ??
      contact.handshake_at ??
      contact.k1_meeting_done_at ??
      contact.updated_at ??
      contact.created_at ??
      null;
    const stalledDays = diffDays(lastTouch);
    const stalledColor = colorForDays(stalledDays);

    const today = new Date().toISOString().slice(0, 10);
    const isParked = !!contact.snoozed_until && contact.snoozed_until >= today;
    const isLost = !!contact.is_lost;
    const isWon = !!contact.won_at;

    const availableMilestones: MilestoneKey[] = [];
    if (!isWon && !isLost) {
      if (!contact.k1_meeting_done_at) availableMilestones.push('k1');
      if (!contact.handshake_at) availableMilestones.push('k2');
      if (!contact.poa_signed_at) availableMilestones.push('k2+');
      if (!contact.audit_done_at) availableMilestones.push('k3');
      if (contact.audit_done_at && !contact.won_at) availableMilestones.push('k4');
    }

    const fullName = contact.contact?.full_name ?? 'kontakt';
    const company = contact.contact?.company ?? '';
    const who = company || fullName;
    let nextStepSuggestion: { title: string; stageKey: MilestoneKey | null } = {
      title: '',
      stageKey: null,
    };
    if (!isWon && !isLost) {
      switch (currentMilestone) {
        case 'prospect':
          nextStepSuggestion = {
            title: `Skontaktuj się z ${fullName}, umów spotkanie`,
            stageKey: 'k1',
          };
          break;
        case 'k1':
          nextStepSuggestion = { title: `Domknij handshake z ${fullName}`, stageKey: 'k2' };
          break;
        case 'k2':
          nextStepSuggestion = { title: `Wyślij POA do podpisu — ${who}`, stageKey: 'k2+' };
          break;
        case 'k2+':
          nextStepSuggestion = { title: `Zaplanuj audyt dla ${who}`, stageKey: 'k3' };
          break;
        case 'k3':
          nextStepSuggestion = { title: `Wyślij ofertę ${who}`, stageKey: 'k4' };
          break;
        case 'k4':
          nextStepSuggestion = { title: '', stageKey: null };
          break;
      }
    }

    const currentOfferingStage = (contact.offering_stage as OfferingStage | null) ?? null;
    const currentOfferingStageLabel = currentOfferingStage
      ? OFFERING_STAGE_LABEL[currentOfferingStage] ?? String(currentOfferingStage)
      : '';

    let availableSubStages: OfferingStage[] = [];
    if (!isWon && !isLost) {
      if (currentMilestone === 'prospect') {
        availableSubStages = PRE_K1_SUBSTAGES.filter((s) => s !== currentOfferingStage);
      } else if (currentMilestone === 'k2+') {
        availableSubStages = PRE_K3_SUBSTAGES.filter((s) => s !== currentOfferingStage);
      } else if (currentMilestone === 'k3') {
        availableSubStages = POST_K3_SUBSTAGES.filter((s) => s !== currentOfferingStage);
      }
    }
    const showSubStageStrip =
      !isWon && !isLost && (currentMilestone === 'prospect' || currentMilestone === 'k3');

    return {
      milestones,
      currentMilestone,
      nextMilestone,
      stalledDays,
      stalledColor,
      isParked,
      parkedUntil: contact.snoozed_until ?? null,
      isLost,
      lostReason: contact.lost_reason ?? null,
      isWon,
      wonAt: contact.won_at ?? null,
      temperature: contact.temperature ?? null,
      availableMilestones,
      nextStepSuggestion,
      currentOfferingStage,
      currentOfferingStageLabel,
      availableSubStages,
      showSubStageStrip,
    };
  }, [contact]);
}
