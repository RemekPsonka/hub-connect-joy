import { useMemo } from 'react';
import type { DealTeamContact } from '@/types/dealTeam';

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
  availableDecisions: DecisionKey[];
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
  contact: Pick<
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
  > | null | undefined,
): ContactTimelineState | null {
  return useMemo(() => {
    if (!contact) return null;

    const milestones: MilestoneState[] = [
      { key: 'prospect', label: 'Prospekt', achieved: true, date: contact.created_at ?? null },
      { key: 'k1', label: 'K1 spotkanie', achieved: !!contact.k1_meeting_done_at, date: contact.k1_meeting_done_at ?? null },
      { key: 'k2', label: 'K2 handshake', achieved: !!contact.handshake_at, date: contact.handshake_at ?? null },
      { key: 'k2+', label: 'K2+ POA', achieved: !!contact.poa_signed_at, date: contact.poa_signed_at ?? null },
      { key: 'k3', label: 'K3 audyt', achieved: !!contact.audit_done_at, date: contact.audit_done_at ?? null },
      { key: 'k4', label: 'K4 klient', achieved: !!contact.won_at, date: contact.won_at ?? null },
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

    let availableDecisions: DecisionKey[] = [];
    if (!isWon && !isLost) {
      availableDecisions = ['push', 'pivot', 'park', 'kill'];
      if (contact.audit_done_at) availableDecisions.push('klient');
    }

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
      availableDecisions,
    };
  }, [contact]);
}
