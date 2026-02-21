const STAGE_LABELS: Record<string, string> = {
  handshake: 'Handshake',
  power_of_attorney: 'Pełnomocnictwo',
  preparation: 'Przygotowanie',
  negotiation: 'Negocjacje',
  accepted: 'Zaakceptowano',
  lost: 'Przegrano',
  audit_plan: 'Do zaplanowania',
  audit_scheduled: 'Zaplanowany',
  audit_done: 'Odbyty',
  meeting_plan: 'Zaplanować spotkanie',
  meeting_scheduled: 'Spotkanie umówione',
  meeting_done: 'Spotkanie odbyte',
};

const CATEGORIES_WITH_SUBSTAGES = new Set(['offering', 'audit', 'hot', 'top']);

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
  // Don't show default stages (handshake for offering, meeting_plan for hot/top, audit_plan for audit)
  const defaults: Record<string, string> = {
    offering: 'handshake',
    hot: 'meeting_plan',
    top: 'meeting_plan',
    audit: 'audit_plan',
  };
  if (defaults[category] === stage) return null;
  return STAGE_LABELS[stage] || null;
}
