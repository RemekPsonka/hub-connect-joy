import { STAGE_LABELS, CATEGORIES_WITH_SUBSTAGES, DEFAULT_STAGES } from '@/config/pipelineStages';

/**
 * Returns a human-readable label for the offering_stage,
 * or null if the category doesn't use sub-stages or stage is the default.
 */
export function offeringStageLabel(
  stage: string | null | undefined,
  category: string
): string | null {
  if (!stage) return null;
  if (!CATEGORIES_WITH_SUBSTAGES.has(category)) return null;
  if (DEFAULT_STAGES[category] === stage) return null;
  return STAGE_LABELS[stage] || null;
}
