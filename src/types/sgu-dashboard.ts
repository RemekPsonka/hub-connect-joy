export type DashboardPriorityKind =
  | 'task'
  | 'contact'
  | 'payment'
  | 'cross_sell';

export interface DashboardPriorityItem {
  kind: DashboardPriorityKind;
  id: string;
  title: string;
  meta: string;
  navigateTo: string;
}
