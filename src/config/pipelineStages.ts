import type { DealCategory, OfferingStage } from '@/types/dealTeam';

// ─── Category (main pipeline column) configuration ──────────

export interface CategoryConfig {
  value: DealCategory;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORY_OPTIONS: CategoryConfig[] = [
  { value: 'hot', label: 'HOT LEAD', icon: '🔥', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'top', label: 'TOP LEAD', icon: '⭐', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'offering', label: 'OFERTOWANIE', icon: '📝', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'audit', label: 'AUDYT', icon: '📋', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  { value: 'lead', label: 'LEAD', icon: '📋', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300' },
  { value: '10x' as DealCategory, label: '10X', icon: '🚀', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'cold', label: 'COLD LEAD', icon: '❄️', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300' },
  { value: 'client', label: 'KLIENT', icon: '✅', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'lost', label: 'PRZEGRANE', icon: '✖️', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

// ─── Sub-stage configuration (single source of truth) ───────

export interface SubStageConfig {
  id: OfferingStage;
  label: string;
  icon: string;
  color: string;
}

export interface SubKanbanConfig {
  title: string;
  icon: string;
  defaultStage: OfferingStage;
  stages: SubStageConfig[];
}

export const SUB_KANBAN_CONFIGS: Record<string, SubKanbanConfig> = {
  audit: {
    title: 'AUDYT',
    icon: '📋',
    defaultStage: 'audit_plan',
    stages: [
      { id: 'audit_plan', label: 'Do zaplanowania', icon: '📋', color: 'border-t-slate-500' },
      { id: 'audit_scheduled', label: 'Zaplanowany', icon: '📅', color: 'border-t-blue-500' },
      { id: 'audit_done', label: 'Odbyty', icon: '✅', color: 'border-t-green-500' },
    ],
  },
  hot: {
    title: 'HOT LEAD',
    icon: '🔥',
    defaultStage: 'meeting_plan',
    stages: [
      { id: 'meeting_plan', label: 'Zaplanować spotkanie', icon: '📋', color: 'border-t-slate-500' },
      { id: 'meeting_scheduled', label: 'Spotkanie umówione', icon: '📅', color: 'border-t-blue-500' },
      { id: 'meeting_done', label: 'Spotkanie odbyte', icon: '✅', color: 'border-t-green-500' },
    ],
  },
  top: {
    title: 'TOP LEAD',
    icon: '⭐',
    defaultStage: 'meeting_plan',
    stages: [
      { id: 'meeting_plan', label: 'Zaplanować spotkanie', icon: '📋', color: 'border-t-slate-500' },
      { id: 'meeting_scheduled', label: 'Spotkanie umówione', icon: '📅', color: 'border-t-blue-500' },
      { id: 'meeting_done', label: 'Spotkanie odbyte', icon: '✅', color: 'border-t-green-500' },
    ],
  },
  offering: {
    title: 'OFERTOWANIE',
    icon: '📝',
    defaultStage: 'handshake',
    stages: [
      { id: 'handshake', label: 'Handshake', icon: '🤝', color: 'border-t-slate-500' },
      { id: 'power_of_attorney', label: 'Pełnomocnictwo', icon: '📄', color: 'border-t-blue-500' },
      { id: 'preparation', label: 'Przygotowanie', icon: '📋', color: 'border-t-amber-500' },
      { id: 'negotiation', label: 'Negocjacje', icon: '💬', color: 'border-t-purple-500' },
      { id: 'accepted', label: 'Zaakceptowano', icon: '✅', color: 'border-t-green-500' },
      { id: 'lost', label: 'Przegrano', icon: '✖️', color: 'border-t-gray-400' },
    ],
  },
};

// ─── Derived helpers ────────────────────────────────────────

/** All sub-stage labels (flat map) — used by badge labels and offeringStageLabel util */
export const STAGE_LABELS: Record<string, string> = {};
for (const config of Object.values(SUB_KANBAN_CONFIGS)) {
  for (const stage of config.stages) {
    STAGE_LABELS[stage.id] = stage.label;
  }
}

/** Categories that have sub-stages */
export const CATEGORIES_WITH_SUBSTAGES = new Set(Object.keys(SUB_KANBAN_CONFIGS));

/** Default stage per category */
export const DEFAULT_STAGES: Record<string, string> = {};
for (const [cat, config] of Object.entries(SUB_KANBAN_CONFIGS)) {
  DEFAULT_STAGES[cat] = config.defaultStage;
}

// ─── Kanban column labels (main contact kanban) ─────────────

export const KANBAN_COLUMN_LABELS: Record<string, string> = {
  offering: 'OFERTOWANIE',
  hot: 'HOT LEAD',
  audit: 'AUDYT',
  top: 'TOP LEAD',
  lead: 'LEAD',
  tenx: '10x',
  cold: 'COLD LEAD',
  lost: 'PRZEGRANE',
  prospecting: 'POSZUKIWANI',
};

// ─── Workflow columns (task kanban) ─────────────────────────

export interface WorkflowColumn {
  id: string;
  label: string;
  icon: string;
  color: string;
  section: string;
  match: (category: string | null | undefined, stage: string | null | undefined) => boolean;
}

export const WORKFLOW_COLUMNS: WorkflowColumn[] = [
  // SPOTKANIA
  { id: 'meeting_plan', label: 'Zaplanować spotkanie', icon: '📞', color: 'amber', section: 'spotkania',
    match: (cat, stage) => (cat === 'hot' || cat === 'top') && (!stage || stage === 'meeting_plan') },
  { id: 'meeting_scheduled', label: 'Spotkanie umówione', icon: '📅', color: 'blue', section: 'spotkania',
    match: (cat, stage) => (cat === 'hot' || cat === 'top') && stage === 'meeting_scheduled' },
  { id: 'meeting_done', label: 'Spotkanie odbyte', icon: '✅', color: 'emerald', section: 'spotkania',
    match: (cat, stage) => (cat === 'hot' || cat === 'top') && stage === 'meeting_done' },
  // OFERTOWANIE
  { id: 'handshake', label: 'Handshake', icon: '🤝', color: 'slate', section: 'ofertowanie',
    match: (cat, stage) => cat === 'offering' && (!stage || stage === 'handshake') },
  { id: 'power_of_attorney', label: 'Pełnomocnictwo', icon: '📄', color: 'blue', section: 'ofertowanie',
    match: (cat, stage) => cat === 'offering' && stage === 'power_of_attorney' },
  { id: 'preparation', label: 'Przygotowanie', icon: '📋', color: 'amber', section: 'ofertowanie',
    match: (cat, stage) => cat === 'offering' && stage === 'preparation' },
  { id: 'negotiation', label: 'Negocjacje', icon: '💬', color: 'purple', section: 'ofertowanie',
    match: (cat, stage) => cat === 'offering' && stage === 'negotiation' },
  { id: 'accepted', label: 'Zaakceptowano', icon: '🎉', color: 'emerald', section: 'ofertowanie',
    match: (cat, stage) => cat === 'offering' && stage === 'accepted' },
  { id: 'offering_lost', label: 'Przegrano', icon: '✖️', color: 'gray', section: 'ofertowanie',
    match: (cat, stage) => cat === 'offering' && stage === 'lost' },
  // AUDYT
  { id: 'audit_plan', label: 'Do zaplanowania', icon: '🔍', color: 'cyan', section: 'audyt',
    match: (cat, stage) => cat === 'audit' && (!stage || stage === 'audit_plan') },
  { id: 'audit_scheduled', label: 'Zaplanowany', icon: '📅', color: 'blue', section: 'audyt',
    match: (cat, stage) => cat === 'audit' && stage === 'audit_scheduled' },
  { id: 'audit_done', label: 'Odbyty', icon: '✅', color: 'emerald', section: 'audyt',
    match: (cat, stage) => cat === 'audit' && stage === 'audit_done' },
  // ZAMKNIĘCIE
  { id: 'client', label: 'Klient', icon: '🏆', color: 'emerald', section: 'zamkniecie',
    match: (cat) => cat === 'client' },
  { id: 'lost', label: 'Przegrane', icon: '✖️', color: 'gray', section: 'zamkniecie',
    match: (cat) => cat === 'lost' },
  // INNE
  { id: 'other', label: 'Inne', icon: '📁', color: 'slate', section: 'inne',
    match: (cat) => !cat || cat === 'lead' || cat === 'cold' || cat === '10x' },
];
