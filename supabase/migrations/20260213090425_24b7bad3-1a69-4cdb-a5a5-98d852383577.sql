
-- Dodanie kolumny konfiguracji częstotliwości statusów per etap
ALTER TABLE deal_teams
ADD COLUMN status_frequency_days jsonb
DEFAULT '{"hot":7,"offering":7,"top":30,"lead":0,"10x":30,"cold":0,"client":30,"lost":0}'::jsonb;

-- Aktualizacja triggera: zamiast stałych 7 dni, odczytuje konfigurację z deal_teams
CREATE OR REPLACE FUNCTION update_deal_team_contact_fields()
RETURNS TRIGGER AS $$
DECLARE
  freq_days int;
  freq_config jsonb;
BEGIN
  NEW.updated_at = now();

  -- Pobierz konfigurację częstotliwości z zespołu
  SELECT COALESCE(status_frequency_days, 
    '{"hot":7,"offering":7,"top":30,"lead":0,"10x":30,"cold":0,"client":30,"lost":0}'::jsonb)
  INTO freq_config
  FROM deal_teams WHERE id = NEW.team_id;

  -- Pobierz dni dla danej kategorii (0 = nie wymaga statusu)
  freq_days := COALESCE((freq_config->>NEW.category)::int, 0);

  IF freq_days = 0 THEN
    NEW.status_overdue = false;
  ELSE
    NEW.status_overdue = (
      NEW.last_status_update IS NULL
      OR NEW.last_status_update < now() - (freq_days || ' days')::interval
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
