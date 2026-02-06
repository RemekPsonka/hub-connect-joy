-- Add user_id column to deal_activities for direct auth.uid() storage
ALTER TABLE public.deal_activities 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_deal_activities_user 
ON public.deal_activities(user_id);

-- Create or replace the activity logging function
CREATE OR REPLACE FUNCTION public.log_deal_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_director_id UUID;
BEGIN
  -- Get director_id for current user (for created_by compatibility)
  SELECT id INTO v_director_id 
  FROM public.directors 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.deal_activities (
      deal_id, user_id, created_by, activity_type, details
    )
    VALUES (
      NEW.id, 
      auth.uid(), 
      v_director_id,
      'created', 
      jsonb_build_object(
        'title', NEW.title,
        'value', NEW.value,
        'currency', NEW.currency,
        'stage_id', NEW.stage_id
      )
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Stage change
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      INSERT INTO public.deal_activities (
        deal_id, user_id, created_by, activity_type, old_value, new_value, details
      )
      VALUES (
        NEW.id, 
        auth.uid(), 
        v_director_id,
        'stage_change',
        OLD.stage_id::TEXT,
        NEW.stage_id::TEXT,
        jsonb_build_object(
          'from_stage_id', OLD.stage_id,
          'to_stage_id', NEW.stage_id
        )
      );
    END IF;
    
    -- Value change
    IF OLD.value IS DISTINCT FROM NEW.value THEN
      INSERT INTO public.deal_activities (
        deal_id, user_id, created_by, activity_type, old_value, new_value, details
      )
      VALUES (
        NEW.id, 
        auth.uid(), 
        v_director_id,
        'value_change',
        OLD.value::TEXT,
        NEW.value::TEXT,
        jsonb_build_object(
          'from_value', OLD.value,
          'to_value', NEW.value,
          'currency', NEW.currency
        )
      );
    END IF;
    
    -- Deal won
    IF OLD.status = 'open' AND NEW.status = 'won' THEN
      INSERT INTO public.deal_activities (
        deal_id, user_id, created_by, activity_type, details
      )
      VALUES (
        NEW.id, 
        auth.uid(), 
        v_director_id,
        'won', 
        jsonb_build_object(
          'value', NEW.value,
          'currency', NEW.currency,
          'won_at', NEW.won_at
        )
      );
    END IF;
    
    -- Deal lost
    IF OLD.status = 'open' AND NEW.status = 'lost' THEN
      INSERT INTO public.deal_activities (
        deal_id, user_id, created_by, activity_type, details
      )
      VALUES (
        NEW.id, 
        auth.uid(), 
        v_director_id,
        'lost', 
        jsonb_build_object(
          'reason', NEW.lost_reason
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_log_deal_activity ON public.deals;

-- Create new trigger
CREATE TRIGGER trigger_log_deal_activity
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_activity();