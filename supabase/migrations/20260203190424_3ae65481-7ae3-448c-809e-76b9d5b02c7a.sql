-- =====================================================
-- CZĘŚĆ 1: Dodanie kolumny updated_at do 9 tabel
-- =====================================================

ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE consultation_meetings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE insurance_products 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE needs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE one_on_one_meetings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE ownership_stakes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE turbo_agent_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- CZĘŚĆ 2: Dodanie triggerów do wszystkich 11 tabel
-- =====================================================

DROP TRIGGER IF EXISTS set_updated_at ON contacts;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON consultations;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON consultation_meetings;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON consultation_meetings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON group_meetings;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON group_meetings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON insurance_products;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON insurance_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON needs;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON needs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON offers;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON offers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON one_on_one_meetings;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON one_on_one_meetings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON ownership_stakes;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON ownership_stakes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON tasks;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON turbo_agent_sessions;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON turbo_agent_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();