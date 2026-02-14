
-- Change default status from 'pending' to 'todo'
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'todo';

-- Update existing records with 'pending' status to 'todo'
UPDATE public.tasks SET status = 'todo' WHERE status = 'pending';
