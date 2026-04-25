ALTER TABLE public.meeting_decisions
  ADD COLUMN IF NOT EXISTS follow_up_task_id uuid
  REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_follow_up_task
  ON public.meeting_decisions(follow_up_task_id)
  WHERE follow_up_task_id IS NOT NULL;