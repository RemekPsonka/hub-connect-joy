-- =============================================
-- CRITICAL SECURITY FIXES - Complete Fix
-- =============================================

-- Step 1: Drop policies that depend on assistant_can_access_contact function
DROP POLICY IF EXISTS "assistant_contact_access" ON public.contacts;
DROP POLICY IF EXISTS "assistant_agent_memory_access" ON public.contact_agent_memory;
DROP POLICY IF EXISTS "assistant_agent_conversations_access" ON public.agent_conversations;

-- Step 2: Now we can safely drop and recreate the function with fixed search_path
DROP FUNCTION IF EXISTS public.assistant_can_access_contact(uuid, uuid);

CREATE OR REPLACE FUNCTION public.assistant_can_access_contact(p_assistant_id uuid, p_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.assistant_group_access aga
    JOIN public.contacts c ON c.primary_group_id = aga.group_id
    WHERE aga.assistant_id = p_assistant_id 
    AND c.id = p_contact_id
  )
$$;

-- Step 3: Recreate the assistant policies with proper checks
CREATE POLICY "assistant_contact_access" ON public.contacts
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.assistants a 
      WHERE a.user_id = auth.uid() 
      AND public.assistant_can_access_contact(a.id, contacts.id)
    )
  );

CREATE POLICY "assistant_agent_memory_access" ON public.contact_agent_memory
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.assistants a 
      WHERE a.user_id = auth.uid() 
      AND public.assistant_can_access_contact(a.id, contact_agent_memory.contact_id)
    )
  );

CREATE POLICY "assistant_agent_conversations_access" ON public.agent_conversations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.assistants a 
      WHERE a.user_id = auth.uid() 
      AND public.assistant_can_access_contact(a.id, agent_conversations.contact_id)
    )
  );

-- Step 4: Continue with RLS policy updates for core tables

-- Contacts - ensure auth check (combined with assistant access)
DROP POLICY IF EXISTS "Contacts tenant access" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON public.contacts;

CREATE POLICY "Contacts tenant access" ON public.contacts
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Needs - ensure auth check
DROP POLICY IF EXISTS "Needs tenant access" ON public.needs;
CREATE POLICY "Needs tenant access" ON public.needs
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Offers - ensure auth check
DROP POLICY IF EXISTS "Offers tenant access" ON public.offers;
CREATE POLICY "Offers tenant access" ON public.offers
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Tasks - ensure auth check
DROP POLICY IF EXISTS "Tasks tenant access" ON public.tasks;
CREATE POLICY "Tasks tenant access" ON public.tasks
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Matches - ensure auth check
DROP POLICY IF EXISTS "Matches tenant access" ON public.matches;
CREATE POLICY "Matches tenant access" ON public.matches
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Connections - ensure auth check
DROP POLICY IF EXISTS "Connections tenant access" ON public.connections;
CREATE POLICY "Connections tenant access" ON public.connections
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Group Meetings - ensure auth check
DROP POLICY IF EXISTS "Group meetings tenant access" ON public.group_meetings;
CREATE POLICY "Group meetings tenant access" ON public.group_meetings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Notifications - ensure auth check
DROP POLICY IF EXISTS "Notifications tenant access" ON public.notifications;
CREATE POLICY "Notifications tenant access" ON public.notifications
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Daily Serendipity - ensure auth check
DROP POLICY IF EXISTS "Daily serendipity tenant access" ON public.daily_serendipity;
CREATE POLICY "Daily serendipity tenant access" ON public.daily_serendipity
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Contact Groups - ensure auth check
DROP POLICY IF EXISTS "Contact groups tenant access" ON public.contact_groups;
CREATE POLICY "Contact groups tenant access" ON public.contact_groups
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Companies - ensure auth check
DROP POLICY IF EXISTS "Companies tenant access" ON public.companies;
CREATE POLICY "Companies tenant access" ON public.companies
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- AI Recommendation Actions - ensure auth check
DROP POLICY IF EXISTS "AI recommendation actions tenant access" ON public.ai_recommendation_actions;
CREATE POLICY "AI recommendation actions tenant access" ON public.ai_recommendation_actions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Contact Agent Memory - ensure auth check (combined with assistant access)
DROP POLICY IF EXISTS "Contact agent memory tenant access" ON public.contact_agent_memory;
CREATE POLICY "Contact agent memory tenant access" ON public.contact_agent_memory
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Agent Conversations - ensure auth check (combined with assistant access)
DROP POLICY IF EXISTS "Agent conversations tenant access" ON public.agent_conversations;
CREATE POLICY "Agent conversations tenant access" ON public.agent_conversations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Master Agent Memory - ensure auth check
DROP POLICY IF EXISTS "Master agent memory tenant access" ON public.master_agent_memory;
CREATE POLICY "Master agent memory tenant access" ON public.master_agent_memory
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Master Agent Queries - ensure auth check
DROP POLICY IF EXISTS "Master agent queries tenant access" ON public.master_agent_queries;
CREATE POLICY "Master agent queries tenant access" ON public.master_agent_queries
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Contact BI Data - ensure auth check
DROP POLICY IF EXISTS "Contact BI data tenant access" ON public.contact_bi_data;
CREATE POLICY "Contact BI data tenant access" ON public.contact_bi_data
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Notification Preferences - ensure auth check
DROP POLICY IF EXISTS "Notification preferences tenant access" ON public.notification_preferences;
CREATE POLICY "Notification preferences tenant access" ON public.notification_preferences
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Default Positions - ensure auth check
DROP POLICY IF EXISTS "Default positions tenant access" ON public.default_positions;
CREATE POLICY "Default positions tenant access" ON public.default_positions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Consultation Questionnaire - ensure auth check
DROP POLICY IF EXISTS "Consultation questionnaire tenant access" ON public.consultation_questionnaire;
CREATE POLICY "Consultation questionnaire tenant access" ON public.consultation_questionnaire
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Assistants - ensure proper access
DROP POLICY IF EXISTS "Assistants tenant access" ON public.assistants;
CREATE POLICY "Assistants tenant access" ON public.assistants
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Directors - ensure proper access
DROP POLICY IF EXISTS "Directors tenant access" ON public.directors;
CREATE POLICY "Directors tenant access" ON public.directors
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

DROP POLICY IF EXISTS "Directors can update own" ON public.directors;
CREATE POLICY "Directors can update own" ON public.directors
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );