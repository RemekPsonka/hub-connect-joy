// ===== ENUMS / UNION TYPES =====

export type DealTeamRole = 'leader' | 'member' | 'viewer';
export type DealCategory = 'hot' | 'top' | 'lead' | '10x' | 'cold' | 'offering' | 'client' | 'lost' | 'audit';
export type DealContactStatus = 'active' | 'on_hold' | 'won' | 'lost' | 'disqualified';
export type DealPriority = 'low' | 'medium' | 'high' | 'urgent';

// ===== SGU REFACTOR IA — new unified taxonomy =====
/** High-level deal pipeline stage (DB: GENERATED ALWAYS AS from category). */
export type DealStage = 'prospect' | 'lead' | 'offering' | 'client' | 'lost';
/** Sub-category for LEAD stage. */
export type Temperature = 'hot' | 'top' | 'cold' | '10x';
/** Sub-category for PROSPECT stage. */
export type ProspectSource = 'crm_push' | 'cc_meeting' | 'ai_krs' | 'ai_web' | 'csv' | 'manual';
/** Sub-category for CLIENT stage. */
export type ClientStatus = 'standard' | 'ambassador' | 'lost';

export interface ClientComplexity {
  property_active: boolean;
  financial_active: boolean;
  communication_active: boolean;
  life_group_active: boolean;
  referrals_count: number;
  references_count: number;
}

/**
 * OFFERING_STAGE — extended after SGU-REFACTOR-IA migration (8 values).
 * Legacy values 'preparation' and 'accepted' have been migrated in DB
 * to 'offer_sent' / 'won' but are kept in the type for backward-compat
 * with any in-flight code paths. UI must use the 8 new values only.
 */
export type OfferingStage =
  | 'decision_meeting'
  | 'handshake'
  | 'power_of_attorney'
  | 'audit'
  | 'offer_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  // legacy aliases (deprecated — do not use in new UI)
  | 'preparation'
  | 'accepted'
  | 'audit_plan'
  | 'audit_scheduled'
  | 'audit_done'
  | 'meeting_plan'
  | 'meeting_scheduled'
  | 'meeting_done';

export type ProspectStatus =
  | 'searching'
  | 'found_connection'
  | 'intro_sent'
  | 'meeting_scheduled'
  | 'converted'
  | 'cancelled';
export type AssignmentStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type CategoryRecommendation = 'keep' | 'promote' | 'demote' | 'close_won' | 'close_lost';
export type ActivityAction =
  | 'category_changed'
  | 'status_changed'
  | 'assigned'
  | 'meeting_scheduled'
  | 'weekly_status'
  | 'prospect_converted'
  | 'note_added'
  | 'assignment_created'
  | 'assignment_completed'
  | 'contact_added'
  | 'contact_removed'
  | 'prospect_created'
  | 'stage_convert'
  | 'stage_rollback';

// ===== INTERFACES =====

export interface DealTeam {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_by: string;
  is_active: boolean;
  weekly_status_day: number;
  created_at: string;
  updated_at: string;
}

export interface DealTeamMember {
  id: string;
  team_id: string;
  director_id: string;
  tenant_id: string;
  role: DealTeamRole;
  is_active: boolean;
  joined_at: string;
  // JOIN z directors
  director?: {
    id: string;
    full_name: string;
    email?: string;
  };
}

export interface DealTeamContact {
  id: string;
  team_id: string;
  contact_id: string;
  source_contact_id: string | null;
  expected_annual_premium_gr: number | null;
  tenant_id: string;
  category: DealCategory;
  status: DealContactStatus;
  assigned_to: string | null;
  priority: DealPriority;
  next_meeting_date: string | null;
  next_meeting_with: string | null;
  next_action: string | null;
  next_action_date: string | null;
  next_action_owner: string | null;
  deal_id: string | null;
  estimated_value: number | null;
  value_currency: string;
  notes: string | null;
  last_status_update: string | null;
  status_overdue: boolean;
  category_changed_at: string;
  ai_brief: string | null;
  ai_brief_generated_at: string | null;
  review_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  snoozed_until: string | null;
  snooze_reason: string | null;
  snoozed_from_category: string | null;
  offering_stage: OfferingStage;
  // SGU-REFACTOR-IA fields
  deal_stage?: DealStage;
  temperature?: Temperature | null;
  prospect_source?: ProspectSource | null;
  client_status?: ClientStatus;
  potential_property_gr?: number;
  potential_financial_gr?: number;
  potential_communication_gr?: number;
  potential_life_group_gr?: number;
  is_lost?: boolean;
  lost_reason?: string | null;
  lost_at?: string | null;
  client_complexity?: ClientComplexity | Record<string, unknown> | null;
  // BLOK 2/3 — milestones K1-K4 (timestamps stamped by trg_set_milestone_timestamps)
  k1_meeting_done_at?: string | null;
  handshake_at?: string | null;
  poa_signed_at?: string | null;
  audit_done_at?: string | null;
  won_at?: string | null;
  created_at: string;
  updated_at: string;
  // JOIN z contacts
  contact?: {
    id: string;
    full_name: string;
    company: string | null;
    position: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    company_id: string | null;
  };
  // JOIN z directors (assigned_to)
  assigned_director?: {
    id: string;
    full_name: string;
  };
}

export interface DealTeamContactStats {
  hot_count: number;
  top_count: number;
  lead_count: number;
  tenx_count: number;
  cold_count: number;
  lost_count: number;
  overdue_count: number;
  total_value: number;
  upcoming_meetings: number;
}

export interface DealTeamProspect {
  id: string;
  team_id: string;
  tenant_id: string;
  prospect_name: string;
  prospect_company: string | null;
  prospect_position: string | null;
  prospect_linkedin: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  prospect_notes: string | null;
  status: ProspectStatus;
  found_via: string | null;
  intro_contact_id: string | null;
  assigned_to: string | null;
  requested_by: string;
  requested_for_reason: string | null;
  priority: DealPriority;
  target_date: string | null;
  converted_to_contact_id: string | null;
  created_at: string;
  updated_at: string;
  // JOIN z directors
  assigned_director?: {
    id: string;
    full_name: string;
  };
  requested_by_director?: {
    id: string;
    full_name: string;
  };
  // JOIN z contacts (intro)
  intro_contact?: {
    id: string;
    full_name: string;
  };
}

export interface DealTeamWeeklyStatus {
  id: string;
  team_id: string;
  team_contact_id: string;
  tenant_id: string;
  week_start: string;
  status_text: string;
  category_recommendation: CategoryRecommendation;
  next_action: string | null;
  submitted_by: string;
  created_at: string;
  // JOIN z directors
  submitted_by_director?: {
    id: string;
    full_name: string;
  };
}

export interface DealTeamAssignment {
  id: string;
  team_contact_id: string;
  team_id: string;
  tenant_id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: AssignmentStatus;
  priority: DealPriority;
  completed_at: string | null;
  created_at: string;
  // JOIN z directors
  assigned_to_director?: {
    id: string;
    full_name: string;
  };
  assigned_by_director?: {
    id: string;
    full_name: string;
  };
}

export interface DealTeamActivityLogEntry {
  id: string;
  team_id: string;
  tenant_id: string;
  team_contact_id: string | null;
  prospect_id: string | null;
  actor_id: string;
  action: ActivityAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  note: string | null;
  created_at: string;
  // JOIN z directors
  actor?: {
    id: string;
    full_name: string;
  };
}

// ===== INPUT TYPES FOR MUTATIONS =====

export interface AddTeamMemberInput {
  teamId: string;
  directorId: string;
  role: DealTeamRole;
}

export interface UpdateMemberRoleInput {
  memberId: string;
  role: DealTeamRole;
  teamId: string;
}

export interface AddContactToTeamInput {
  teamId: string;
  contactId: string;
  category: DealCategory;
  assignedTo?: string;
  priority?: DealPriority;
  notes?: string;
  estimatedValue?: number;
  valueCurrency?: string;
}

export interface UpdateTeamContactInput {
  id: string;
  teamId: string;
  category?: DealCategory;
  status?: DealContactStatus;
  assignedTo?: string | null;
  priority?: DealPriority;
  nextMeetingDate?: string | null;
  nextMeetingWith?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  nextActionOwner?: string | null;
  dealId?: string | null;
  estimatedValue?: number | null;
  valueCurrency?: string;
  notes?: string | null;
  reviewFrequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  offeringStage?: OfferingStage;
  snoozedUntil?: string | null;
  snoozeReason?: string | null;
  snoozedFromCategory?: string | null;
  clientStatus?: ClientStatus | string;
  temperature?: Temperature | null;
  prospectSource?: ProspectSource | null;
  isLost?: boolean;
  lostReason?: string | null;
  lostAt?: string | null;
  expectedAnnualPremiumGr?: number | null;
  potentialPropertyGr?: number | null;
  potentialFinancialGr?: number | null;
  potentialCommunicationGr?: number | null;
  potentialLifeGroupGr?: number | null;
}

export interface PromoteContactInput {
  id: string;
  teamId: string;
  newCategory: DealCategory;
}

// ===== SGU-REFACTOR-IA — labels for UI =====

export const STAGE_LABELS: Record<DealStage, string> = {
  prospect: 'Prospekt',
  lead: 'Lead',
  offering: 'Ofertowanie',
  client: 'Klient',
  lost: 'Przegrane',
};

export const TEMPERATURE_LABELS: Record<Temperature, string> = {
  hot: '🔥 HOT',
  top: '⭐ TOP',
  cold: '❄️ COLD',
  '10x': '🔄 10x',
};

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  crm_push: 'CRM push',
  cc_meeting: 'Spotkanie CC',
  ai_krs: 'AI KRS',
  ai_web: 'AI WWW',
  csv: 'Import CSV',
  manual: 'Ręcznie',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  standard: 'Standard',
  ambassador: '🏆 Ambasador',
  lost: 'Utracony',
};

export const OFFERING_STAGE_LABELS: Partial<Record<OfferingStage, string>> = {
  decision_meeting: 'Spotkanie decyzyjne',
  handshake: 'Handshake',
  power_of_attorney: 'Pełnomocnictwo',
  audit: 'Audyt',
  offer_sent: 'Złożona oferta',
  negotiation: 'Negocjacje',
  won: 'Wygrana',
  lost: 'Przegrana',
};

/** Order of offering stages used by UI popover. */
export const OFFERING_STAGE_ORDER: OfferingStage[] = [
  'decision_meeting',
  'handshake',
  'power_of_attorney',
  'audit',
  'offer_sent',
  'negotiation',
  'won',
  'lost',
];
