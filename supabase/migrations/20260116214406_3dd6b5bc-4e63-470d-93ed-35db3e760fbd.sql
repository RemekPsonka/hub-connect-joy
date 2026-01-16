-- 1. group_meetings - główna tabela spotkań grupowych
CREATE TABLE public.group_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 180,
    location TEXT,
    city TEXT,
    expected_participant_count INTEGER,
    actual_participant_count INTEGER,
    status TEXT DEFAULT 'upcoming',
    recommendations_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. meeting_participants - uczestnicy spotkań
CREATE TABLE public.meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.group_meetings(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    is_member BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    attendance_status TEXT DEFAULT 'invited',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, contact_id)
);

-- 3. meeting_recommendations - rekomendacje 1x1
CREATE TABLE public.meeting_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.group_meetings(id) ON DELETE CASCADE,
    for_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    recommended_contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    reasoning TEXT,
    talking_points TEXT,
    match_type TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meeting_id, for_contact_id, recommended_contact_id)
);

-- 4. one_on_one_meetings - zarejestrowane spotkania 1x1
CREATE TABLE public.one_on_one_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_meeting_id UUID NOT NULL REFERENCES public.group_meetings(id) ON DELETE CASCADE,
    contact_a_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    contact_b_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    was_recommended BOOLEAN DEFAULT false,
    recommendation_id UUID REFERENCES public.meeting_recommendations(id) ON DELETE SET NULL,
    outcome TEXT DEFAULT 'neutral',
    notes TEXT,
    follow_up_needed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.group_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_on_one_meetings ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_meetings
CREATE POLICY "tenant_access" ON public.group_meetings
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- RLS policies for meeting_participants
CREATE POLICY "tenant_access" ON public.meeting_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.group_meetings gm
            WHERE gm.id = meeting_participants.meeting_id
            AND gm.tenant_id = get_current_tenant_id()
        )
    );

-- RLS policies for meeting_recommendations
CREATE POLICY "tenant_access" ON public.meeting_recommendations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.group_meetings gm
            WHERE gm.id = meeting_recommendations.meeting_id
            AND gm.tenant_id = get_current_tenant_id()
        )
    );

-- RLS policies for one_on_one_meetings
CREATE POLICY "tenant_access" ON public.one_on_one_meetings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.group_meetings gm
            WHERE gm.id = one_on_one_meetings.group_meeting_id
            AND gm.tenant_id = get_current_tenant_id()
        )
    );

-- Indexes for performance
CREATE INDEX idx_group_meetings_tenant ON public.group_meetings(tenant_id);
CREATE INDEX idx_group_meetings_scheduled ON public.group_meetings(scheduled_at);
CREATE INDEX idx_meeting_participants_meeting ON public.meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_contact ON public.meeting_participants(contact_id);
CREATE INDEX idx_meeting_recommendations_meeting ON public.meeting_recommendations(meeting_id);
CREATE INDEX idx_meeting_recommendations_for_contact ON public.meeting_recommendations(for_contact_id);
CREATE INDEX idx_one_on_one_meetings_group ON public.one_on_one_meetings(group_meeting_id);

-- Enable realtime for participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;