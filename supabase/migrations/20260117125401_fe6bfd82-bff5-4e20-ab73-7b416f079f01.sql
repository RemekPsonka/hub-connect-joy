-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table for main questionnaire data
CREATE TABLE consultation_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  
  -- Header fields
  member_email TEXT,
  director_name TEXT,
  member_name TEXT,
  cc_group TEXT,
  next_meeting_date DATE,
  
  -- PART I - Business Information
  current_engagement TEXT,
  previous_projects_review TEXT,
  group_engagement_rating INTEGER CHECK (group_engagement_rating >= 1 AND group_engagement_rating <= 10),
  group_engagement_details TEXT,
  valuable_education_topics TEXT,
  business_goals_needing_support TEXT,
  strategic_partners_sought TEXT,
  
  -- PART III - Summary
  key_cc_events_plan TEXT,
  strategic_contacts_needed TEXT,
  expertise_contribution TEXT,
  value_for_community TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(consultation_id)
);

-- Table for 1-on-1 meetings tracking
CREATE TABLE consultation_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('past_outside', 'planned_outside', 'on_event', 'planned_on_event')),
  contact_name TEXT,
  company TEXT,
  cc_group TEXT,
  meeting_date DATE,
  follow_up TEXT,
  comment TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for recommendations given/received
CREATE TABLE consultation_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('given_external', 'given_internal', 'received')),
  contact_name TEXT,
  company TEXT,
  recommendation_kind TEXT CHECK (recommendation_kind IN ('external', 'internal')),
  topic TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for guests invited to CC meetings
CREATE TABLE consultation_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  guest_type TEXT NOT NULL CHECK (guest_type IN ('invited', 'planned_invitation')),
  guest_name TEXT,
  meeting_date DATE,
  comment TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for TYFCB (Thank You For Closed Business)
CREATE TABLE consultation_thanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  contact_name TEXT,
  transaction_amount TEXT,
  business_benefit_type TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for AI chat messages (brief and summary)
CREATE TABLE consultation_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('brief', 'summary')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE consultation_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_thanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultation_questionnaire
CREATE POLICY "Users can view questionnaires in their tenant"
ON consultation_questionnaire FOR SELECT
USING (tenant_id = (SELECT get_current_tenant_id()));

CREATE POLICY "Users can create questionnaires in their tenant"
ON consultation_questionnaire FOR INSERT
WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

CREATE POLICY "Users can update questionnaires in their tenant"
ON consultation_questionnaire FOR UPDATE
USING (tenant_id = (SELECT get_current_tenant_id()));

CREATE POLICY "Users can delete questionnaires in their tenant"
ON consultation_questionnaire FOR DELETE
USING (tenant_id = (SELECT get_current_tenant_id()));

-- RLS policies for consultation_meetings (via consultation -> tenant)
CREATE POLICY "Users can manage consultation_meetings"
ON consultation_meetings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM consultations c 
    WHERE c.id = consultation_id 
    AND c.tenant_id = (SELECT get_current_tenant_id())
  )
);

-- RLS policies for consultation_recommendations
CREATE POLICY "Users can manage consultation_recommendations"
ON consultation_recommendations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM consultations c 
    WHERE c.id = consultation_id 
    AND c.tenant_id = (SELECT get_current_tenant_id())
  )
);

-- RLS policies for consultation_guests
CREATE POLICY "Users can manage consultation_guests"
ON consultation_guests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM consultations c 
    WHERE c.id = consultation_id 
    AND c.tenant_id = (SELECT get_current_tenant_id())
  )
);

-- RLS policies for consultation_thanks
CREATE POLICY "Users can manage consultation_thanks"
ON consultation_thanks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM consultations c 
    WHERE c.id = consultation_id 
    AND c.tenant_id = (SELECT get_current_tenant_id())
  )
);

-- RLS policies for consultation_chat_messages
CREATE POLICY "Users can manage consultation_chat_messages"
ON consultation_chat_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM consultations c 
    WHERE c.id = consultation_id 
    AND c.tenant_id = (SELECT get_current_tenant_id())
  )
);

-- Indexes for performance
CREATE INDEX idx_consultation_questionnaire_consultation ON consultation_questionnaire(consultation_id);
CREATE INDEX idx_consultation_meetings_consultation ON consultation_meetings(consultation_id);
CREATE INDEX idx_consultation_recommendations_consultation ON consultation_recommendations(consultation_id);
CREATE INDEX idx_consultation_guests_consultation ON consultation_guests(consultation_id);
CREATE INDEX idx_consultation_thanks_consultation ON consultation_thanks(consultation_id);
CREATE INDEX idx_consultation_chat_messages_consultation ON consultation_chat_messages(consultation_id, chat_type);

-- Trigger for updated_at on questionnaire
CREATE TRIGGER update_consultation_questionnaire_updated_at
BEFORE UPDATE ON consultation_questionnaire
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();