UPDATE public.deal_team_contacts dtc
SET 
  prospect_source = 'cc_meeting',
  category = CASE
    WHEN dtc.category IN ('client','offering','audit','lost') THEN dtc.category
    WHEN dtc.category = 'lead' AND dtc.temperature IS NULL THEN 'prospect'
    ELSE dtc.category
  END
FROM public.prospects p
WHERE p.converted_to_team_contact_id = dtc.id
  AND p.source_type = 'meeting'
  AND dtc.prospect_source IS NULL;