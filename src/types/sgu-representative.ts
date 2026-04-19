export interface SGURepresentativeProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  region: string | null;
  notes: string | null;
  active: boolean;
  invited_at: string;
  invited_by_user_id: string | null;
  onboarded_at: string | null;
  deactivated_at: string | null;
  deactivated_reason: string | null;
  created_at: string;
  updated_at: string;
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
