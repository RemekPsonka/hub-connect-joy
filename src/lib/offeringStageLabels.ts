export type OfferingStage =
  | 'decision_meeting'
  | 'meeting_plan'
  | 'meeting_scheduled'
  | 'meeting_done'
  | 'handshake'
  | 'power_of_attorney'
  | 'audit_plan'
  | 'audit_scheduled'
  | 'audit_done'
  | 'audit'
  | 'offer_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export const OFFERING_STAGE_LABEL: Record<OfferingStage, string> = {
  decision_meeting: 'Spotkanie decyzyjne',
  meeting_plan: 'Umawiamy spotkanie',
  meeting_scheduled: 'Spotkanie umówione',
  meeting_done: 'Po spotkaniu',
  handshake: 'Handshake',
  power_of_attorney: 'Pełnomocnictwo',
  audit_plan: 'Audyt planowany',
  audit_scheduled: 'Audyt umówiony',
  audit_done: 'Po audycie',
  audit: 'Audyt',
  offer_sent: 'Złożona oferta',
  negotiation: 'Negocjacje',
  won: 'Wygrana',
  lost: 'Przegrana',
};

/** Sub-stages widoczne kontekstowo między milestone'ami. */
export const PRE_K1_SUBSTAGES: OfferingStage[] = [
  'decision_meeting',
  'meeting_plan',
  'meeting_scheduled',
];
export const PRE_K3_SUBSTAGES: OfferingStage[] = ['audit_plan', 'audit_scheduled'];
export const POST_K3_SUBSTAGES: OfferingStage[] = ['offer_sent', 'negotiation'];
