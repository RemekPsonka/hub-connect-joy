/**
 * Adapter: converts DB pipeline_stages rows into formats used by existing components.
 * Falls back to hardcoded values from pipelineStages.ts when DB data is empty.
 */
import type { PipelineStage, PipelineTransition } from '@/hooks/usePipelineConfig';
import {
  CATEGORY_OPTIONS,
  SUB_KANBAN_CONFIGS,
  WORKFLOW_COLUMNS,
  type CategoryConfig,
  type SubKanbanConfig,
  type SubStageConfig,
  type WorkflowColumn,
} from './pipelineStages';
import type { DealCategory, OfferingStage } from '@/types/dealTeam';

// ─── Main kanban ────────────────────────────────────────────

export function toCategoryOptions(stages: PipelineStage[]): CategoryConfig[] {
  const mainStages = stages.filter(s => s.kanban_type === 'main');
  if (!mainStages.length) return CATEGORY_OPTIONS;

  return mainStages
    .sort((a, b) => a.position - b.position)
    .map(s => ({
      value: s.stage_key as DealCategory,
      label: s.label,
      icon: s.icon,
      color: s.color,
    }));
}

// ─── Sub-kanbans ────────────────────────────────────────────

export function toSubKanbanConfigs(stages: PipelineStage[]): Record<string, SubKanbanConfig> {
  const subStages = stages.filter(s => s.kanban_type === 'sub');
  if (!subStages.length) return SUB_KANBAN_CONFIGS;

  const grouped: Record<string, PipelineStage[]> = {};
  for (const s of subStages) {
    const parent = s.parent_stage_key || 'unknown';
    if (!grouped[parent]) grouped[parent] = [];
    grouped[parent].push(s);
  }

  const result: Record<string, SubKanbanConfig> = {};
  for (const [parentKey, stageList] of Object.entries(grouped)) {
    const sorted = stageList.sort((a, b) => a.position - b.position);
    const defaultStage = sorted.find(s => s.is_default) || sorted[0];
    // Find parent main stage for title/icon
    const mainStage = stages.find(s => s.kanban_type === 'main' && s.stage_key === parentKey);

    result[parentKey] = {
      title: mainStage?.label || parentKey.toUpperCase(),
      icon: mainStage?.icon || '📋',
      defaultStage: (defaultStage?.stage_key || sorted[0]?.stage_key) as OfferingStage,
      stages: sorted.map(s => ({
        id: s.stage_key as OfferingStage,
        label: s.label,
        icon: s.icon,
        color: s.color,
      })),
    };
  }

  return result;
}

// ─── Workflow columns ───────────────────────────────────────

export function toWorkflowColumns(stages: PipelineStage[]): WorkflowColumn[] {
  const wfStages = stages.filter(s => s.kanban_type === 'workflow');
  if (!wfStages.length) return WORKFLOW_COLUMNS;

  return wfStages
    .sort((a, b) => a.position - b.position)
    .map(s => {
      const parentCategories = s.parent_stage_key?.split(',') || [];
      return {
        id: s.stage_key,
        label: s.label,
        icon: s.icon,
        color: s.color,
        section: s.section || '',
        match: (cat: string | null | undefined, stage: string | null | undefined) => {
          // Generate match logic based on parent_stage_key
          if (!cat) return s.stage_key.includes('other');
          return parentCategories.includes(cat);
        },
      } satisfies WorkflowColumn;
    });
}

// ─── Transition checking ────────────────────────────────────

export function isTransitionAllowed(
  transitions: PipelineTransition[],
  stages: PipelineStage[],
  fromStageKey: string,
  toStageKey: string,
  kanbanType: string
): boolean {
  // No transitions defined = all allowed
  const relevant = transitions.filter(t => t.kanban_type === kanbanType && t.is_active);
  if (!relevant.length) return true;

  const fromStage = stages.find(s => s.stage_key === fromStageKey && s.kanban_type === kanbanType);
  const toStage = stages.find(s => s.stage_key === toStageKey && s.kanban_type === kanbanType);
  if (!fromStage || !toStage) return true;

  return relevant.some(t => t.from_stage_id === fromStage.id && t.to_stage_id === toStage.id);
}
