CREATE SCHEMA IF NOT EXISTS archive;
CREATE TABLE IF NOT EXISTS archive.deal_team_contacts_backup_20260425 AS
  SELECT * FROM public.deal_team_contacts WHERE 1=0;
INSERT INTO archive.deal_team_contacts_backup_20260425
  SELECT * FROM public.deal_team_contacts WHERE id = 'e964173e-e79a-49b8-b21f-b18b87a69eca';

DELETE FROM public.meeting_decisions WHERE deal_team_contact_id = 'e964173e-e79a-49b8-b21f-b18b87a69eca';
DELETE FROM public.task_contacts WHERE task_id IN (
  SELECT id FROM public.tasks WHERE deal_team_contact_id = 'e964173e-e79a-49b8-b21f-b18b87a69eca'
);
DELETE FROM public.tasks WHERE deal_team_contact_id = 'e964173e-e79a-49b8-b21f-b18b87a69eca';

UPDATE public.deal_team_contacts SET
  category = 'prospect',
  offering_stage = NULL,
  status = 'active',
  k1_meeting_done_at = NULL,
  handshake_at = NULL,
  poa_signed_at = NULL,
  audit_done_at = NULL,
  won_at = NULL,
  is_lost = false,
  lost_reason = NULL,
  lost_at = NULL,
  snoozed_until = NULL,
  temperature = NULL,
  expected_annual_premium_gr = NULL,
  potential_property_gr = NULL,
  potential_financial_gr = NULL,
  potential_communication_gr = NULL,
  potential_life_group_gr = NULL,
  client_complexity = '{}'::jsonb,
  updated_at = now()
WHERE id = 'e964173e-e79a-49b8-b21f-b18b87a69eca';