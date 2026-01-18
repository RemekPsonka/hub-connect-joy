-- Dodaj pole phone_business do tabeli contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_business TEXT;

-- Dodaj pole phone do tabeli companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;

-- Usuń starą funkcję i utwórz nową z nowym typem zwracanym
DROP FUNCTION IF EXISTS find_duplicate_contact(UUID, TEXT, TEXT, TEXT, TEXT);

-- Zaktualizuj funkcję find_duplicate_contact - porównanie ostatnich 9 cyfr telefonu
CREATE OR REPLACE FUNCTION find_duplicate_contact(
  p_tenant_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  contact_id UUID,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_full_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_phone_business TEXT,
  contact_company TEXT,
  contact_position TEXT
) AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_phone_digits TEXT;
BEGIN
  -- Normalize inputs
  v_first_name := LOWER(TRIM(COALESCE(p_first_name, '')));
  v_last_name := LOWER(TRIM(COALESCE(p_last_name, '')));
  v_email := LOWER(TRIM(COALESCE(p_email, '')));
  -- Extract only digits from phone and take last 9
  v_phone_digits := RIGHT(REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g'), 9);

  RETURN QUERY
  SELECT 
    c.id AS contact_id,
    c.first_name AS contact_first_name,
    c.last_name AS contact_last_name,
    c.full_name AS contact_full_name,
    c.email AS contact_email,
    c.phone AS contact_phone,
    c.phone_business AS contact_phone_business,
    c.company AS contact_company,
    c.position AS contact_position
  FROM contacts c
  WHERE 
    c.tenant_id = p_tenant_id
    AND c.is_active = true
    AND LOWER(TRIM(COALESCE(c.first_name, ''))) = v_first_name
    AND LOWER(TRIM(COALESCE(c.last_name, ''))) = v_last_name
    AND (
      -- Match by email if provided
      (v_email <> '' AND LOWER(TRIM(COALESCE(c.email, ''))) = v_email)
      OR
      -- Match by last 9 digits of phone (private or business)
      (v_phone_digits <> '' AND LENGTH(v_phone_digits) >= 9 AND (
        RIGHT(REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '', 'g'), 9) = v_phone_digits
        OR
        RIGHT(REGEXP_REPLACE(COALESCE(c.phone_business, ''), '[^0-9]', '', 'g'), 9) = v_phone_digits
      ))
      OR
      -- If no email or phone provided, match by name only
      (v_email = '' AND v_phone_digits = '')
    )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;