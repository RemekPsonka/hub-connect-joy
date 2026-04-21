-- Backfill: prospekty z CC skonwertowane do deal_team_contacts
-- nigdy nie miały ustawionego prospect_source ani deal_stage='prospect'.
-- Mapujemy historyczne rekordy z prospects.source_type='meeting'
-- na deal_stage='prospect' + prospect_source='cc_meeting'
-- TYLKO jeśli rekord jest nadal "świeży" (kategoria/stage = lead bez aktywności).

-- ROLLBACK:
-- UPDATE public.deal_team_contacts dtc
-- SET deal_stage = NULL, prospect_source = NULL
-- FROM public.prospects p
-- WHERE p.converted_to_team_contact_id = dtc.id
--   AND p.source_type = 'meeting'
--   AND dtc.prospect_source = 'cc_meeting'
--   AND dtc.updated_at < '2026-04-21 19:11:00+00';

UPDATE public.deal_team_contacts dtc
SET 
  prospect_source = 'cc_meeting',
  deal_stage = CASE
    -- jeśli już promowany do offering/client/lost → zostaw
    WHEN dtc.deal_stage IN ('offering','client','lost') THEN dtc.deal_stage
    -- jeśli kategoria już zaawansowana → zostaw lead/offering/client
    WHEN dtc.category IN ('client','offering','audit','lost') THEN dtc.deal_stage
    -- świeży (lead bez temperature lub w ogóle bez deal_stage) → wraca do prospect
    WHEN dtc.deal_stage = 'lead' AND dtc.temperature IS NULL THEN 'prospect'
    WHEN dtc.deal_stage IS NULL THEN 'prospect'
    ELSE dtc.deal_stage
  END
FROM public.prospects p
WHERE p.converted_to_team_contact_id = dtc.id
  AND p.source_type = 'meeting'
  AND dtc.prospect_source IS NULL;
