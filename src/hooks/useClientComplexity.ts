import { useMemo } from 'react';
import type { SGUClientRow } from './useSGUClientsPortfolio';
import type { ClientComplexity } from '@/types/dealTeam';

export interface ComplexityArea {
  key: keyof ClientComplexity | 'referrals' | 'references';
  label: string;
  icon: string;
  active: boolean;
  count?: number;
  potentialGr?: number;
}

export interface ClientComplexityResult {
  areas: ComplexityArea[];
  greenCount: number;
  totalAreas: number;
}

interface RawComplexity {
  property_active?: boolean;
  financial_active?: boolean;
  communication_active?: boolean;
  life_group_active?: boolean;
  referrals_count?: number;
  references_count?: number;
}

interface RawDtc {
  client_complexity?: RawComplexity | Record<string, unknown> | null;
  potential_property_gr?: number;
  potential_financial_gr?: number;
  potential_communication_gr?: number;
  potential_life_group_gr?: number;
}

function hasPolicyType(row: SGUClientRow, kw: string[]): boolean {
  return row.policies.some((p) => {
    const t = (p.policy_type ?? '').toLowerCase();
    return kw.some((k) => t.includes(k));
  });
}

/**
 * Derives the 6-area complexity status for a client.
 * Active = client_complexity.<x>_active is true OR detected from policies.
 */
export function getClientComplexity(row: SGUClientRow, dtc?: RawDtc): ClientComplexityResult {
  const c = (dtc?.client_complexity ?? {}) as RawComplexity;
  const propertyActive = !!c.property_active || hasPolicyType(row, ['majątk', 'majatk', 'property', 'mieszk']);
  const financialActive = !!c.financial_active || hasPolicyType(row, ['finans', 'invest', 'kapit']);
  const communicationActive = !!c.communication_active || hasPolicyType(row, ['oc', 'ac', 'komunik']);
  const lifeGroupActive = !!c.life_group_active || hasPolicyType(row, ['życ', 'zyc', 'life', 'grup']);
  const referralsCount = c.referrals_count ?? 0;
  const referencesCount = c.references_count ?? 0;

  const areas: ComplexityArea[] = [
    { key: 'property_active', label: 'Majątek', icon: '🏠', active: propertyActive, potentialGr: dtc?.potential_property_gr },
    { key: 'financial_active', label: 'Finansowe', icon: '💰', active: financialActive, potentialGr: dtc?.potential_financial_gr },
    { key: 'communication_active', label: 'Komunikacja', icon: '📞', active: communicationActive, potentialGr: dtc?.potential_communication_gr },
    { key: 'life_group_active', label: 'Życie/Grupowe', icon: '🏥', active: lifeGroupActive, potentialGr: dtc?.potential_life_group_gr },
    { key: 'referrals', label: 'Polecenia', icon: '🎯', active: referralsCount > 0, count: referralsCount },
    { key: 'references', label: 'Referencje', icon: '📢', active: referencesCount > 0, count: referencesCount },
  ];

  const greenCount = areas.filter((a) => a.active).length;
  return { areas, greenCount, totalAreas: areas.length };
}

export function useClientComplexity(rows: SGUClientRow[]): Map<string, ClientComplexityResult> {
  return useMemo(() => {
    const map = new Map<string, ClientComplexityResult>();
    for (const r of rows) {
      // dtc fields are not yet in SGUClientRow; pass undefined → fallback heuristic
      map.set(r.id, getClientComplexity(r));
    }
    return map;
  }, [rows]);
}
