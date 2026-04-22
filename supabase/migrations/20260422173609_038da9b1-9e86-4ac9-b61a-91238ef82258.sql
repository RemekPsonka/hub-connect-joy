-- =====================================================================
-- HOTFIX-OS1: Extend deal_team_contacts_offering_stage_check whitelist
-- Background: SGU-REFACTOR-IA narrowed CHECK to 8 high-level stages,
-- but FE (pipelineStages.ts, ContactActionButtons, TaskDetailSheet)
-- still uses 6 granular sub-stages for HOT/TOP/AUDYT pipelines.
-- =====================================================================

ALTER TABLE public.deal_team_contacts
  DROP CONSTRAINT IF EXISTS deal_team_contacts_offering_stage_check;

ALTER TABLE public.deal_team_contacts
  ADD CONSTRAINT deal_team_contacts_offering_stage_check
  CHECK (
    offering_stage IS NULL
    OR offering_stage = ANY (ARRAY[
      -- SGU-REFACTOR-IA high-level stages
      'decision_meeting', 'handshake', 'power_of_attorney', 'audit',
      'offer_sent', 'negotiation', 'won', 'lost',
      -- Pipeline sub-stages (HOT/TOP)
      'meeting_plan', 'meeting_scheduled', 'meeting_done',
      -- Pipeline sub-stages (AUDYT)
      'audit_plan', 'audit_scheduled', 'audit_done'
    ])
  );

-- ROLLBACK:
-- ALTER TABLE public.deal_team_contacts
--   DROP CONSTRAINT IF EXISTS deal_team_contacts_offering_stage_check;
-- ALTER TABLE public.deal_team_contacts
--   ADD CONSTRAINT deal_team_contacts_offering_stage_check
--   CHECK (offering_stage IS NULL OR offering_stage = ANY (ARRAY[
--     'decision_meeting', 'handshake', 'power_of_attorney', 'audit',
--     'offer_sent', 'negotiation', 'won', 'lost'
--   ]));