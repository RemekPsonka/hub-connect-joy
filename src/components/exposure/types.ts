export type ActivityType = 'production' | 'warehouse' | 'office' | 'retail';
export type ConstructionType = 'non_combustible' | 'combustible';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  production: 'Produkcja',
  warehouse: 'Magazyn',
  office: 'Biuro',
  retail: 'Handel',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  production: 'bg-amber-500',
  warehouse: 'bg-emerald-500',
  office: 'bg-sky-500',
  retail: 'bg-violet-500',
};

export const CONSTRUCTION_TYPE_LABELS: Record<ConstructionType, string> = {
  non_combustible: 'Niepalna',
  combustible: 'Palna / Płyta warstwowa',
};

export interface ExposureLocation {
  id: string;
  company_id: string;
  tenant_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  activity_type: ActivityType;
  construction_type: ConstructionType;
  building_value: number;
  machinery_value: number;
  stock_value: number;
  stock_fluctuation: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationExposure extends ExposureLocation {
  total_value: number;
  risk_tier: 'low' | 'medium' | 'high';
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  message: string;
  locationId?: string;
}

export const VALUE_THRESHOLDS = {
  LOW: 10_000_000,
  MEDIUM: 50_000_000,
};

export function getRiskTier(totalValue: number): 'low' | 'medium' | 'high' {
  if (totalValue < VALUE_THRESHOLDS.LOW) return 'low';
  if (totalValue < VALUE_THRESHOLDS.MEDIUM) return 'medium';
  return 'high';
}

export function getPinColor(totalValue: number): string {
  if (totalValue < VALUE_THRESHOLDS.LOW) return 'text-emerald-500';
  if (totalValue < VALUE_THRESHOLDS.MEDIUM) return 'text-amber-500';
  return 'text-red-500';
}

export function formatValuePLN(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M PLN`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K PLN`;
  }
  return `${value} PLN`;
}
