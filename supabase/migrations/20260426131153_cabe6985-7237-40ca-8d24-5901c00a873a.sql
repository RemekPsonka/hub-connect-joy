-- Seed: 1 kontakt do kolumny Cold + 1 do Lead, żeby były dane do testów manualnych S7-v2 Kanban DnD
-- Cold = category='lead', brak meeting markers. Lead = category='lead' + offering_stage='meeting_scheduled'.

-- Mariusz Fertacz → Cold (do Testów 3, 4, 8)
UPDATE public.deal_team_contacts
SET category = 'lead', offering_stage = NULL
WHERE id = '67dba5e6-9a01-42fe-9bfe-453c337acc70';

-- Rafał Ryskalok → Lead (do Testu 5)
UPDATE public.deal_team_contacts
SET category = 'lead', offering_stage = 'meeting_scheduled', next_meeting_date = (now() + interval '3 days')
WHERE id = '48906c78-84fb-445d-b32a-9b7c6a4a6dfd';

-- ROLLBACK:
-- UPDATE public.deal_team_contacts SET category='prospect', offering_stage=NULL, next_meeting_date=NULL
-- WHERE id IN ('67dba5e6-9a01-42fe-9bfe-453c337acc70','48906c78-84fb-445d-b32a-9b7c6a4a6dfd');