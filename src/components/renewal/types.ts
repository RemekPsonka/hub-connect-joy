export type PolicyType = 'property' | 'fleet' | 'do' | 'cyber' | 'liability' | 'life' | 'health' | 'other';

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  property: 'Majątek',
  fleet: 'Flota',
  do: 'D&O',
  cyber: 'Cyber',
  liability: 'OC',
  life: 'Życie',
  health: 'Zdrowie',
  other: 'Inne',
};

export const POLICY_TYPE_COLORS: Record<PolicyType, string> = {
  property: 'hsl(217, 91%, 60%)',   // blue
  fleet: 'hsl(160, 84%, 39%)',      // emerald
  do: 'hsl(258, 90%, 66%)',         // violet
  cyber: 'hsl(38, 92%, 50%)',       // amber
  liability: 'hsl(0, 84%, 60%)',    // red
  life: 'hsl(186, 94%, 41%)',       // cyan
  health: 'hsl(330, 81%, 60%)',     // pink
  other: 'hsl(220, 9%, 46%)',       // gray
};

export interface RenewalChecklist {
  data_update_requested: boolean;
  market_tender_done: boolean;
  negotiation_completed: boolean;
  board_approval_obtained: boolean;
}

export interface InsurancePolicy {
  id: string;
  company_id: string;
  tenant_id: string;
  policy_type: PolicyType;
  policy_number?: string | null;
  policy_name: string;
  insurer_name?: string | null;
  broker_name?: string | null;
  start_date: string;
  end_date: string;
  renewal_checklist: RenewalChecklist;
  sum_insured?: number | null;
  premium?: number | null;
  notes?: string | null;
  is_our_policy?: boolean;
  workflow_status?: string;
  moved_to_finalization_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeViewMode = 'months' | 'quarters' | 'semesters';

export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  dangerZoneDays: number;
  actionPhaseDays: number;
  showCriticalPath: boolean;
  darkMode: boolean;
  viewMode: TimeViewMode;
}

export const CHECKLIST_LABELS: Record<keyof RenewalChecklist, string> = {
  data_update_requested: 'Aktualizacja danych',
  market_tender_done: 'Przetarg rynkowy',
  negotiation_completed: 'Negocjacje zakończone',
  board_approval_obtained: 'Zgoda Zarządu',
};

// Default commission rates per policy type (%)
export const DEFAULT_COMMISSION_RATES: Record<PolicyType, number> = {
  property: 18,
  fleet: 8,
  do: 25,
  cyber: 20,
  liability: 12,
  life: 15,
  health: 10,
  other: 15,
};
