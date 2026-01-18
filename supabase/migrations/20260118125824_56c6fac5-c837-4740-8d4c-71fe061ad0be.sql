-- =============================================
-- FIX REMAINING SECURITY WARNINGS
-- =============================================

-- Find and fix all functions without search_path set
-- These are the remaining functions that need fixing

-- Fix update_updated_at_column if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public';
  END IF;
END $$;

-- Fix any trigger functions
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT p.proname, n.nspname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND NOT EXISTS (
      SELECT 1 FROM pg_options_to_table(p.proconfig) 
      WHERE option_name = 'search_path'
    )
    AND p.proname NOT IN ('gin_extract_query_trgm', 'gin_extract_value_trgm', 'gin_trgm_consistent', 'gin_trgm_triconsistent')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I SET search_path = public', func_record.proname);
    EXCEPTION WHEN OTHERS THEN
      -- Some functions may not be alterable, skip them
      RAISE NOTICE 'Could not alter function: %', func_record.proname;
    END;
  END LOOP;
END $$;

-- Specifically fix known functions that may be missing search_path
-- update_contact_search_text
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_contact_search_text' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.update_contact_search_text() SET search_path = public';
  END IF;
END $$;

-- search_all_hybrid
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_all_hybrid' AND pronamespace = 'public'::regnamespace) THEN
    -- Note: This function has arguments, need to handle properly
    NULL;
  END IF;
END $$;

-- Add auth.uid() IS NOT NULL check to any remaining tables
-- Cross Tasks
DROP POLICY IF EXISTS "Cross tasks access" ON public.cross_tasks;
CREATE POLICY "Cross tasks access" ON public.cross_tasks
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = cross_tasks.task_id
      AND t.tenant_id = public.get_current_tenant_id()
    )
  );

-- Task Contacts
DROP POLICY IF EXISTS "Task contacts access" ON public.task_contacts;
CREATE POLICY "Task contacts access" ON public.task_contacts
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_contacts.task_id
      AND t.tenant_id = public.get_current_tenant_id()
    )
  );

-- Meeting Participants
DROP POLICY IF EXISTS "Meeting participants access" ON public.meeting_participants;
CREATE POLICY "Meeting participants access" ON public.meeting_participants
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.group_meetings gm
      WHERE gm.id = meeting_participants.meeting_id
      AND gm.tenant_id = public.get_current_tenant_id()
    )
  );

-- Meeting Recommendations
DROP POLICY IF EXISTS "Meeting recommendations access" ON public.meeting_recommendations;
CREATE POLICY "Meeting recommendations access" ON public.meeting_recommendations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.group_meetings gm
      WHERE gm.id = meeting_recommendations.meeting_id
      AND gm.tenant_id = public.get_current_tenant_id()
    )
  );

-- One on One Meetings
DROP POLICY IF EXISTS "One on one meetings access" ON public.one_on_one_meetings;
CREATE POLICY "One on one meetings access" ON public.one_on_one_meetings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.group_meetings gm
      WHERE gm.id = one_on_one_meetings.group_meeting_id
      AND gm.tenant_id = public.get_current_tenant_id()
    )
  );

-- Consultation Chat Messages
DROP POLICY IF EXISTS "Consultation chat messages access" ON public.consultation_chat_messages;
CREATE POLICY "Consultation chat messages access" ON public.consultation_chat_messages
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_chat_messages.consultation_id
      AND c.tenant_id = public.get_current_tenant_id()
    )
  );

-- Consultation Meetings
DROP POLICY IF EXISTS "Consultation meetings access" ON public.consultation_meetings;
CREATE POLICY "Consultation meetings access" ON public.consultation_meetings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_meetings.consultation_id
      AND c.tenant_id = public.get_current_tenant_id()
    )
  );

-- Consultation Recommendations
DROP POLICY IF EXISTS "Consultation recommendations access" ON public.consultation_recommendations;
CREATE POLICY "Consultation recommendations access" ON public.consultation_recommendations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_recommendations.consultation_id
      AND c.tenant_id = public.get_current_tenant_id()
    )
  );

-- Consultation Guests
DROP POLICY IF EXISTS "Consultation guests access" ON public.consultation_guests;
CREATE POLICY "Consultation guests access" ON public.consultation_guests
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_guests.consultation_id
      AND c.tenant_id = public.get_current_tenant_id()
    )
  );

-- Consultation Thanks
DROP POLICY IF EXISTS "Consultation thanks access" ON public.consultation_thanks;
CREATE POLICY "Consultation thanks access" ON public.consultation_thanks
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_thanks.consultation_id
      AND c.tenant_id = public.get_current_tenant_id()
    )
  );

-- BI Interview Sessions
DROP POLICY IF EXISTS "BI interview sessions access" ON public.bi_interview_sessions;
CREATE POLICY "BI interview sessions access" ON public.bi_interview_sessions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contact_bi_data cbd
      WHERE cbd.id = bi_interview_sessions.contact_bi_id
      AND cbd.tenant_id = public.get_current_tenant_id()
    )
  );

-- Contact BI History
DROP POLICY IF EXISTS "Contact BI history access" ON public.contact_bi_history;
CREATE POLICY "Contact BI history access" ON public.contact_bi_history
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contact_bi_data cbd
      WHERE cbd.id = contact_bi_history.contact_bi_id
      AND cbd.tenant_id = public.get_current_tenant_id()
    )
  );

-- Contact Merge History
DROP POLICY IF EXISTS "Contact merge history access" ON public.contact_merge_history;
CREATE POLICY "Contact merge history access" ON public.contact_merge_history
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_current_tenant_id()
  );

-- Assistant Group Access
DROP POLICY IF EXISTS "Assistant group access policy" ON public.assistant_group_access;
CREATE POLICY "Assistant group access policy" ON public.assistant_group_access
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.assistants a
      WHERE a.id = assistant_group_access.assistant_id
      AND a.tenant_id = public.get_current_tenant_id()
    )
  );