export type Currency = 'PLN' | 'EUR' | 'USD';

export const CURRENCY_LABELS: Record<Currency, string> = {
  PLN: 'PLN',
  EUR: 'EUR',
  USD: 'USD',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PLN: 'zł',
  EUR: '€',
  USD: '$',
};

export interface TerritorialSplit {
  poland_pct: number;
  eu_oecd_pct: number;
  usa_canada_pct: number;
  rest_world_pct: number;
}

export interface ActivityProfile {
  manufacturing: boolean;
  services: boolean;
  installation: boolean;
  trading: boolean;
}

export interface SpecialExposures {
  aviation_auto_rail_offshore: boolean;
  ecommerce: boolean;
  b2b_vs_b2c_pct: number;
}

export interface LiabilityExposureProfile {
  id: string;
  company_id: string;
  tenant_id: string;
  total_annual_revenue: number;
  currency: Currency;
  territory_poland_pct: number;
  territory_eu_oecd_pct: number;
  territory_usa_canada_pct: number;
  territory_rest_world_pct: number;
  activity_manufacturing: boolean;
  activity_services: boolean;
  activity_installation: boolean;
  activity_trading: boolean;
  services_advisory_pct: number | null;
  exposure_aviation_auto_rail_offshore: boolean;
  exposure_ecommerce: boolean;
  b2b_vs_b2c_pct: number;
  ai_suggested_limit_eur: number | null;
  ai_recommendation_reason: string | null;
  ai_generated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiabilityRiskAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  trigger: string;
}

export interface TerritoryChartData {
  name: string;
  value: number;
  color: string;
  isDanger?: boolean;
}

export const TERRITORY_COLORS = {
  poland: 'hsl(142, 71%, 45%)',      // emerald-500
  eu_oecd: 'hsl(217, 91%, 60%)',     // blue-500
  usa_canada: 'hsl(0, 84%, 60%)',    // red-500 (DANGER)
  rest_world: 'hsl(220, 9%, 46%)',   // gray-500
};

export const ACTIVITY_RISK_INFO = {
  manufacturing: {
    label: 'Produkcja',
    riskType: 'Ryzyko Produktowe',
    icon: 'Factory',
  },
  services: {
    label: 'Usługi / Doradztwo',
    riskType: 'OC Zawodowe',
    icon: 'Briefcase',
  },
  installation: {
    label: 'Instalacje / Prace ręczne',
    riskType: 'OC Ogólna',
    icon: 'Wrench',
  },
  trading: {
    label: 'Handel / Dystrybucja',
    riskType: 'Trading',
    icon: 'ShoppingCart',
  },
};
