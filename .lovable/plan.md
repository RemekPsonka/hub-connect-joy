
# Plan: Rozbudowa Materialized View dla metryk dashboardu

## Cel

Rozbudowanie istniejącego `mv_dashboard_stats` o brakujące metryki oraz dodanie automatycznych triggerów odświeżania. Zmiana z 4-9 zapytań na jedno wywołanie RPC.

---

## Obecny stan bazy danych

### Istniejące obiekty
| Obiekt | Status | Uwagi |
|--------|--------|-------|
| `mv_dashboard_stats` | ✅ Istnieje | 7 kolumn, bez timestamp |
| `get_dashboard_stats(p_tenant_id)` | ✅ Istnieje | Wymaga parametru |
| `refresh_dashboard_stats()` | ✅ Istnieje | Działa |
| `get_current_tenant_id()` | ✅ Istnieje | Pobiera tenant z auth |
| Triggery automatyczne | ❌ Brak | Do dodania |

### Różnice w schemacie
| Żądana kolumna | Stan w bazie |
|----------------|--------------|
| `is_deleted` | ❌ Brak — używamy `is_active` |
| `consultations.date` | ❌ Brak — używamy `scheduled_at` |

---

## Składniki migracji

### Krok 1: Usunięcie i odtworzenie MV z nowymi kolumnami

```sql
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_stats CASCADE;

CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
  t.id AS tenant_id,
  -- Kontakty
  (SELECT COUNT(*) FROM contacts c 
   WHERE c.tenant_id = t.id AND c.is_active = true) AS total_contacts,
  (SELECT COUNT(*) FROM contacts c 
   WHERE c.tenant_id = t.id AND c.is_active = true
   AND c.created_at >= NOW() - INTERVAL '30 days') AS new_contacts_30d,
  (SELECT COUNT(*) FROM contacts c 
   WHERE c.tenant_id = t.id AND c.is_active = true
   AND c.created_at >= NOW() - INTERVAL '60 days'
   AND c.created_at < NOW() - INTERVAL '30 days') AS contacts_prev_30d,
  -- Konsultacje
  (SELECT COUNT(*) FROM consultations co
   JOIN contacts c ON c.id = co.contact_id
   WHERE c.tenant_id = t.id 
   AND co.scheduled_at::date = CURRENT_DATE) AS today_consultations,
  -- Zadania
  (SELECT COUNT(*) FROM tasks tk 
   WHERE tk.tenant_id = t.id AND tk.status = 'pending') AS pending_tasks,
  -- Potrzeby i oferty
  (SELECT COUNT(*) FROM needs n 
   WHERE n.tenant_id = t.id AND n.status = 'active') AS active_needs,
  (SELECT COUNT(*) FROM offers o 
   WHERE o.tenant_id = t.id AND o.status = 'active') AS active_offers,
  -- Dopasowania
  (SELECT COUNT(*) FROM matches m 
   WHERE m.tenant_id = t.id AND m.status = 'pending') AS pending_matches,
  -- Spotkania grupowe
  (SELECT COUNT(*) FROM group_meetings gm 
   WHERE gm.tenant_id = t.id AND gm.status = 'upcoming') AS upcoming_meetings,
  -- Network Health
  (SELECT COUNT(*) FROM relationship_health rh
   JOIN contacts c ON c.id = rh.contact_id
   WHERE c.tenant_id = t.id AND rh.health_score >= 70) AS healthy_contacts,
  (SELECT COUNT(*) FROM relationship_health rh
   JOIN contacts c ON c.id = rh.contact_id
   WHERE c.tenant_id = t.id 
   AND rh.health_score BETWEEN 40 AND 69) AS warning_contacts,
  (SELECT COUNT(*) FROM relationship_health rh
   JOIN contacts c ON c.id = rh.contact_id
   WHERE c.tenant_id = t.id AND rh.health_score < 40) AS critical_contacts,
  -- Metadata
  NOW() AS refreshed_at
FROM tenants t;
```

### Krok 2: Unikalny indeks (wymagany dla CONCURRENT)

```sql
CREATE UNIQUE INDEX idx_mv_dashboard_stats_tenant 
ON mv_dashboard_stats(tenant_id);
```

### Krok 3: Nowa funkcja RPC (bez parametru)

```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE(
  total_contacts BIGINT,
  new_contacts_30d BIGINT,
  contacts_prev_30d BIGINT,
  today_consultations BIGINT,
  pending_tasks BIGINT,
  active_needs BIGINT,
  active_offers BIGINT,
  pending_matches BIGINT,
  upcoming_meetings BIGINT,
  healthy_contacts BIGINT,
  warning_contacts BIGINT,
  critical_contacts BIGINT,
  refreshed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := get_current_tenant_id();
BEGIN
  RETURN QUERY
  SELECT 
    mv.total_contacts, mv.new_contacts_30d, mv.contacts_prev_30d,
    mv.today_consultations, mv.pending_tasks, mv.active_needs,
    mv.active_offers, mv.pending_matches, mv.upcoming_meetings,
    mv.healthy_contacts, mv.warning_contacts, mv.critical_contacts,
    mv.refreshed_at
  FROM mv_dashboard_stats mv
  WHERE mv.tenant_id = v_tenant_id;
END;
$$;
```

### Krok 4: Triggery automatycznego refresha

```sql
-- Funkcja trigger (już istnieje, ale nadpiszemy dla pewności)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  RETURN NULL;
END;
$$;

-- Triggery na kluczowych tabelach
CREATE TRIGGER trg_refresh_dash_contacts
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_needs
  AFTER INSERT OR UPDATE OR DELETE ON needs
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();

CREATE TRIGGER trg_refresh_dash_matches
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH STATEMENT EXECUTE FUNCTION refresh_dashboard_stats();
```

---

## Dostosowania do schematu

| Żądanie użytkownika | Dostosowanie |
|---------------------|--------------|
| `c.is_deleted = false` | → `c.is_active = true` |
| `co.date = CURRENT_DATE` | → `co.scheduled_at::date = CURRENT_DATE` |

---

## Zakres zmian

### Plik migracji SQL
Jedna migracja zawierająca:
1. DROP istniejącego MV (CASCADE usunie też stare funkcje)
2. CREATE nowego MV z 13 kolumnami
3. CREATE UNIQUE INDEX
4. CREATE OR REPLACE funkcji `get_dashboard_stats()` (bez parametru)
5. CREATE OR REPLACE funkcji `refresh_dashboard_stats()` (trigger)
6. CREATE TRIGGER na 5 tabelach

---

## Bez zmian (zgodnie z instrukcją)

| Element | Status |
|---------|--------|
| Frontend (`Dashboard.tsx`) | ❌ Bez zmian |
| `useAnalytics.ts` | ❌ Bez zmian |
| Edge Functions | ❌ Bez zmian |
| Istniejące tabele | ❌ Bez zmian |

---

## Użycie w przyszłości (następny sprint)

```typescript
// Dashboard.tsx - zamiana 4 zapytań na jedno
const { data } = await supabase.rpc('get_dashboard_stats');

// Wynik:
// {
//   total_contacts: 150,
//   new_contacts_30d: 12,
//   contacts_prev_30d: 8,
//   today_consultations: 3,
//   pending_tasks: 25,
//   active_needs: 18,
//   active_offers: 22,
//   pending_matches: 5,
//   upcoming_meetings: 2,
//   healthy_contacts: 85,
//   warning_contacts: 45,
//   critical_contacts: 20,
//   refreshed_at: "2026-02-05T07:30:00Z"
// }
```

---

## Testy weryfikacyjne

Po wykonaniu migracji:

```sql
-- Test 1: Sprawdź strukturę MV
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mv_dashboard_stats';

-- Test 2: Wywołaj funkcję RPC
SELECT * FROM get_dashboard_stats();

-- Test 3: Sprawdź triggery
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'trg_refresh_dash%';

-- Test 4: Sprawdź refreshed_at po mutacji
INSERT INTO contacts (tenant_id, full_name, is_active) 
VALUES (get_current_tenant_id(), 'Test', true);
SELECT refreshed_at FROM mv_dashboard_stats 
WHERE tenant_id = get_current_tenant_id();
```

---

## Uwagi dotyczące wydajności

| Aspekt | Komentarz |
|--------|-----------|
| CONCURRENT refresh | Wymaga UNIQUE INDEX — dodany |
| Trigger STATEMENT level | Jeden refresh per operacja batch |
| Subqueries vs JOINs | Subqueries dla czytelności i łatwiejszego debugowania |
| Koszt refresh | ~50-100ms przy typowych rozmiarach danych |
