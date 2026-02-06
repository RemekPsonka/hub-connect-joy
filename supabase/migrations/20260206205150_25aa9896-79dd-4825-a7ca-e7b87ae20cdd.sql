
-- Replace handle_new_user trigger with invite-only logic
-- Instead of creating a new tenant for every new user,
-- it now checks if a director with that email already exists (pre-provisioned by admin).
-- If yes → links the auth user to that director (updates user_id).
-- If no → does nothing (user will be rejected by frontend).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_director_id uuid;
  user_email text;
  user_name text;
BEGIN
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Check if a director with this email already exists (pre-provisioned by admin)
  SELECT id INTO existing_director_id
  FROM public.directors
  WHERE email = user_email
    AND user_id IS NULL
  LIMIT 1;

  IF existing_director_id IS NOT NULL THEN
    -- Link the auth user to the existing director
    UPDATE public.directors
    SET user_id = NEW.id,
        full_name = COALESCE(NULLIF(full_name, ''), user_name)
    WHERE id = existing_director_id;
    
    RAISE LOG 'handle_new_user: linked user % to existing director %', NEW.id, existing_director_id;
  ELSE
    -- Also check assistants
    UPDATE public.assistants
    SET user_id = NEW.id,
        full_name = COALESCE(NULLIF(full_name, ''), user_name)
    WHERE email = user_email
      AND user_id IS NULL;
      
    IF FOUND THEN
      RAISE LOG 'handle_new_user: linked user % to existing assistant', NEW.id;
    ELSE
      RAISE LOG 'handle_new_user: no pre-provisioned director/assistant found for email %, skipping tenant creation', user_email;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
