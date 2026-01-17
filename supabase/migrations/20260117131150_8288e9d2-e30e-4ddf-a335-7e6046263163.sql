-- Add contact_id to consultation_meetings
ALTER TABLE consultation_meetings ADD COLUMN contact_id UUID REFERENCES contacts(id);

-- Add contact_id to consultation_recommendations
ALTER TABLE consultation_recommendations ADD COLUMN contact_id UUID REFERENCES contacts(id);

-- Add contact_id to consultation_guests
ALTER TABLE consultation_guests ADD COLUMN contact_id UUID REFERENCES contacts(id);

-- Add contact_id to consultation_thanks
ALTER TABLE consultation_thanks ADD COLUMN contact_id UUID REFERENCES contacts(id);