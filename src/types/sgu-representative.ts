export interface SGURepresentativeProfile {
  user_id: string;
  tenant_id: string;
  team_id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  phone: string | null;
  region: string | null;
  notes: string | null;
  active: boolean;
  invited_at: string;
  invited_by_user_id: string | null;
  onboarded_at: string | null;
  deactivated_at: string | null;
  deactivated_by_user_id: string | null;
  commission_override_pct: number | null;
}

export interface InviteRepInput {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  region?: string;
}

export interface RepAssignment {
  id: string;
  tenant_id: string;
  team_id: string;
  deal_team_contact_id: string;
  representative_user_id: string;
  assigned_by_user_id: string | null;
  assigned_at: string;
  active: boolean;
  unassigned_at: string | null;
  notes: string | null;
}

export type RepStatusFilter = 'active' | 'all' | 'deactivated';
