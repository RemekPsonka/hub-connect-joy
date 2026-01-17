-- Create daily_serendipity table
CREATE TABLE IF NOT EXISTS public.daily_serendipity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES directors(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  
  contact_a_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_b_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  need_id UUID REFERENCES needs(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  viewed_at TIMESTAMPTZ,
  acted_on BOOLEAN DEFAULT false,
  acted_at TIMESTAMPTZ,
  feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, director_id, date)
);

CREATE INDEX idx_daily_serendipity_tenant ON daily_serendipity(tenant_id);
CREATE INDEX idx_daily_serendipity_director ON daily_serendipity(director_id);
CREATE INDEX idx_daily_serendipity_date ON daily_serendipity(date);

ALTER TABLE public.daily_serendipity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON public.daily_serendipity
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES directors(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  entity_type TEXT,
  entity_id UUID,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMPTZ,
  
  priority TEXT DEFAULT 'normal',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_director ON notifications(director_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON public.notifications
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  director_id UUID NOT NULL REFERENCES directors(id) ON DELETE CASCADE,
  
  consultation_reminders BOOLEAN DEFAULT true,
  task_overdue BOOLEAN DEFAULT true,
  new_matches BOOLEAN DEFAULT true,
  relationship_decay BOOLEAN DEFAULT true,
  daily_serendipity BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(director_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON public.notification_preferences
  FOR ALL USING (tenant_id = get_current_tenant_id());