/**
 * Types for SGU report snapshots.
 * Mirrors `public.sgu_reports_snapshots` row + the `data` JSONB payload
 * built by `rpc_sgu_generate_snapshot_internal`.
 */

export type SGUPeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type SGUGeneratedBy = 'cron' | 'manual';
export type SGUAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface KPIBlock {
  policies_sold_count: number;
  gwp_pln: number;
  commission_pln: number;
  completed_tasks_count: number;
  new_leads_count: number;
  conversion_rate_pct: number;
}

export interface KPIDelta {
  metric: keyof KPIBlock;
  current: number;
  previous: number;
  delta_pct: number | null;
}

export interface TopProduct {
  product_id: string | null;
  product_name: string;
  policies_count: number;
  gwp_pln: number;
  commission_pln: number;
}

export interface TeamPerformanceRow {
  user_id: string | null;
  full_name: string;
  policies_count: number;
  gwp_pln: number;
  commission_pln: number;
}

export interface CommissionBreakdownRow {
  recipient_label: string;
  amount_pln: number;
  share_pct: number;
}

export interface SGUAlert {
  code: string;
  severity: SGUAlertSeverity;
  message: string;
  context?: Record<string, unknown>;
}

export interface ComparisonBlock {
  previous_period_start: string | null;
  previous_period_end: string | null;
  previous_kpi: KPIBlock | null;
  deltas: KPIDelta[];
}

export interface SnapshotData {
  kpi: KPIBlock;
  top_products: TopProduct[];
  team_performance: TeamPerformanceRow[];
  commission_breakdown: CommissionBreakdownRow[];
  alerts: SGUAlert[];
  comparison_previous_period: ComparisonBlock;
}

export interface SGUReportSnapshot {
  id: string;
  tenant_id: string;
  team_id: string;
  period_type: SGUPeriodType;
  period_start: string;
  period_end: string;
  data: SnapshotData;
  generated_at: string;
  generated_by: SGUGeneratedBy;
  generated_by_user_id: string | null;
}

export const PERIOD_TYPE_LABELS: Record<SGUPeriodType, string> = {
  weekly: 'Tygodniowy',
  monthly: 'Miesięczny',
  quarterly: 'Kwartalny',
  yearly: 'Roczny',
  custom: 'Niestandardowy',
};

export const SEVERITY_LABELS: Record<SGUAlertSeverity, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};
