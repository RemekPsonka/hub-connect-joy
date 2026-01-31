export type InsuranceStatus = 'insured' | 'gap' | 'unknown' | 'pending';

export const STATUS_COLORS: Record<InsuranceStatus, string> = {
  insured: '#3B82F6',   // Niebieski - W pełni ubezpieczone
  gap: '#EF4444',       // Czerwony - Nieubezpieczone / LUKA
  pending: '#F59E0B',   // Żółty - Oczekuje na pokrycie
  unknown: '#6B7280',   // Szary - Nieznany status
};

export const STATUS_LABELS: Record<InsuranceStatus, string> = {
  insured: 'Ubezpieczone',
  gap: 'LUKA',
  pending: 'Oczekuje',
  unknown: 'Nieznane',
};

export interface ParentCompanyNodeData {
  label: string;
  nip?: string;
  krs?: string;
  revenue?: number;
  revenueYear?: number;
  insuranceStatus: InsuranceStatus;
  broker?: string;
  companyId?: string;
}

export interface SubsidiaryNodeData {
  label: string;
  role: 'subsidiary' | 'affiliate' | 'branch' | 'parent';
  ownershipPercent?: number;
  nip?: string;
  krs?: string;
  regon?: string;
  revenue?: number;
  revenueYear?: number;
  insuranceStatus: InsuranceStatus;
  broker?: string;
  linkedCompanyId?: string;
  memberId?: string;
}

export interface AssetLocationNodeData {
  label: string;
  type: 'factory' | 'warehouse' | 'office' | 'land' | 'other';
  address?: string;
  insuranceStatus: InsuranceStatus;
  sumInsured?: number;
  parentCompanyId?: string;
}

export type StructureNodeData = ParentCompanyNodeData | SubsidiaryNodeData | AssetLocationNodeData;

export interface PolicyGroup {
  policyNumber: string;
  policyName: string;
  nodeIds: string[];
  color: string;
}

export interface SelectedNodeInfo {
  id: string;
  type: 'parent' | 'subsidiary' | 'asset';
  data: StructureNodeData;
}
