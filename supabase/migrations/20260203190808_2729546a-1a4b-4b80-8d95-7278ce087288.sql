-- =====================================================
-- Etap 1.2: Trigger health_score na UPDATE contacts
-- =====================================================

-- Dodanie triggera AFTER UPDATE dla przeliczania health_score
-- gdy zmieni się last_contact_date, relationship_strength lub is_active

DROP TRIGGER IF EXISTS recalc_health_on_contact_update ON contacts;

CREATE TRIGGER recalc_health_on_contact_update
AFTER UPDATE OF last_contact_date, relationship_strength, is_active ON contacts
FOR EACH ROW
EXECUTE FUNCTION trigger_update_relationship_health();