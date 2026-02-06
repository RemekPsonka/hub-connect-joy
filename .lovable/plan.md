
# Rozbudowa schematu Deals -- brakujace elementy

## Podsumowanie

Modul Deals jest juz **w duzym stopniu zaimplementowany**. Istnieja 4 z 5 proponowanych tabel, 6 etapow pipeline, RLS policies, triggery, oraz pelny frontend (Kanban, tabela, analityka, szczegoly, produkty). Plan koncentruje sie wylacznie na dodaniu **brakujacych elementow** do istniejacego schematu.

## Istniejacy stan vs specyfikacja

| Element | Stan w DB | Spec uzytkownika | Wymagana zmiana |
|---------|-----------|-------------------|-----------------|
| `deal_stages` | Istnieje (6 etapow, `probability_default`, `is_closed_won/lost`, `is_active`) | `probability`, `is_won`, `is_lost`, `is_default` | Brak — nazwy inne ale funkcjonalnie identyczne |
| `deals` | Istnieje (18 kolumn, `probability`, `status`, `team_id`) | `probability_override`, `priority`, `notes`, `tags`, `sort_order`, `actual_close_date` | Dodac 5 kolumn |
| `deal_products` | Istnieje (`total_price` generated, `description`) | `discount_percent`, `tenant_id`, `notes` | Dodac `discount_percent`, przebudowac `total_price` |
| `deal_activities` | Istnieje (`activity_type`, `description`, `old_value`, `new_value`, `details`) | `type`, `content`, `metadata` — inne nazwy | Brak — funkcjonalnie identyczne |
| `deal_history` | NIE istnieje | Oddzielna tabela historii | Dodac tabele |
| Trigger `log_deal_activity` | Istnieje — loguje stage/value/won/lost | `track_deal_stage_change` | Brak — juz pokryty |
| Trigger auto-sum produktow | NIE istnieje | `update_deal_value_from_products` | Dodac trigger |
| Trigger `updated_at` | Istnieje | Wymagany | Juz pokryty |
| MV `mv_deal_pipeline_stats` | NIE istnieje | Dashboard pipeline stats | Dodac MV |
| RLS policies | Istnieja (granularne per operacja) | Prostsze `FOR ALL` | Brak zmian — obecne sa lepsze |
| Indexy | Brak dedykowanych | 6 indexow | Dodac indexy |
| Edge Function `deal-setup` | Nie istnieje, ale `seed_deal_stages_for_tenant()` RPC istnieje | Inicjalizacja etapow | Brak — RPC juz dziala |
| Frontend | Pelny (Kanban, tabela, analityka, detail, produkty) | --- | Brak zmian w ramach tego planu |

## Co zostanie zrobione

### 1. Migracja SQL -- nowe kolumny na `deals`

```text
ALTER TABLE deals ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sort_order int4 DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS actual_close_date date;

-- Walidacja priority
ALTER TABLE deals ADD CONSTRAINT deals_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));
```

Kolumna `probability` juz istnieje i sluzy jako odpowiednik `probability_override` ze specyfikacji. Nie trzeba dodawac nowej kolumny — `probability` jest nadpisywana per deal i nadpisuje `probability_default` ze stage'a.

### 2. Migracja SQL -- `discount_percent` na `deal_products`

```text
ALTER TABLE deal_products ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;

-- Przebudowa total_price aby uwzgledniac discount
-- Najpierw usun stara wygenerowana kolumne
ALTER TABLE deal_products DROP COLUMN IF EXISTS total_price;

-- Dodaj nowa z discount
ALTER TABLE deal_products ADD COLUMN total_price numeric(12,2) 
  GENERATED ALWAYS AS (quantity * unit_price * (1 - COALESCE(discount_percent, 0) / 100)) STORED;
```

### 3. Migracja SQL -- tabela `deal_history`

```text
CREATE TABLE deal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES directors(id),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  old_stage_id uuid REFERENCES deal_stages(id),
  new_stage_id uuid REFERENCES deal_stages(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_history_select" ON deal_history
  FOR SELECT USING (tenant_id = get_current_tenant_id());

CREATE POLICY "deal_history_insert" ON deal_history
  FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id());

CREATE INDEX idx_deal_history_deal ON deal_history(deal_id);
CREATE INDEX idx_deal_history_deal_created ON deal_history(deal_id, created_at DESC);
```

Uwaga: `deal_activities` nadal istnieje i jest uzywany przez trigger `log_deal_activity` oraz caly frontend. `deal_history` to dodatkowa tabela do szczegoowego sledzenia zmian pol (nie tylko stage).

### 4. Trigger -- auto-suma wartosci z produktow

```text
CREATE OR REPLACE FUNCTION update_deal_value_from_products()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deals SET 
    value = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM deal_products 
      WHERE deal_id = COALESCE(NEW.deal_id, OLD.deal_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.deal_id, OLD.deal_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trigger_update_deal_value
  AFTER INSERT OR UPDATE OR DELETE ON deal_products
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_value_from_products();
```

Ten trigger zastapi manualne klikniecie "Ustaw jako wartosc deal" w UI -- wartosc bedzie automatycznie synchronizowana.

### 5. Trigger -- zapis do deal_history przy zmianach

```text
CREATE OR REPLACE FUNCTION track_deal_field_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_director_id uuid;
BEGIN
  SELECT id INTO v_director_id FROM directors WHERE user_id = auth.uid() LIMIT 1;
  IF v_director_id IS NULL THEN
    v_director_id := NEW.owner_id;
  END IF;

  -- Stage change
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO deal_history (tenant_id, deal_id, changed_by, field_name, old_value, new_value, old_stage_id, new_stage_id)
    VALUES (
      NEW.tenant_id, NEW.id, v_director_id, 'stage_id',
      (SELECT name FROM deal_stages WHERE id = OLD.stage_id),
      (SELECT name FROM deal_stages WHERE id = NEW.stage_id),
      OLD.stage_id, NEW.stage_id
    );
  END IF;

  -- Value change
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    INSERT INTO deal_history (tenant_id, deal_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.tenant_id, NEW.id, v_director_id, 'value', OLD.value::text, NEW.value::text);
  END IF;

  -- Status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO deal_history (tenant_id, deal_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.tenant_id, NEW.id, v_director_id, 'status', OLD.status, NEW.status);
  END IF;

  -- Priority change (nowe pole)
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO deal_history (tenant_id, deal_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.tenant_id, NEW.id, v_director_id, 'priority', OLD.priority, NEW.priority);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trigger_track_deal_fields
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION track_deal_field_changes();
```

Uwaga: istniejacy trigger `trigger_log_deal_activity` nadal dziala i zapisuje do `deal_activities`. Nowy trigger dodaje granularne wpisy do `deal_history`. Oba moga wspolistniec.

### 6. Materialized View -- pipeline stats

```text
CREATE MATERIALIZED VIEW mv_deal_pipeline_stats AS
SELECT
  ds.tenant_id,
  ds.id as stage_id,
  ds.name as stage_name,
  ds.position as stage_position,
  ds.color as stage_color,
  ds.probability_default as stage_probability,
  COUNT(d.id) as deals_count,
  COALESCE(SUM(d.value), 0) as total_value,
  COALESCE(AVG(d.value), 0) as avg_value,
  COALESCE(SUM(d.value * COALESCE(d.probability, ds.probability_default) / 100.0), 0) as weighted_value
FROM deal_stages ds
LEFT JOIN deals d ON d.stage_id = ds.id AND d.status = 'open'
WHERE ds.is_active = true
GROUP BY ds.tenant_id, ds.id, ds.name, ds.position, ds.color, ds.probability_default
ORDER BY ds.position;

CREATE UNIQUE INDEX idx_mv_deal_pipeline ON mv_deal_pipeline_stats(tenant_id, stage_id);

CREATE OR REPLACE FUNCTION refresh_deal_pipeline_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_deal_pipeline_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

Uwaga: LEFT JOIN z warunkiem `d.status = 'open'` -- MV liczy tylko aktywne deale. Uzywa `probability_default` (istniejaca kolumna w `deal_stages`) i `probability` (istniejaca kolumna w `deals`).

### 7. Indexy na istniejacych tabelach

```text
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON deals(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_products_deal ON deal_products(deal_id);
```

---

## Czego NIE robimy

| Element | Powod |
|---------|-------|
| Tworzenie `deal_stages` | Juz istnieje z 6 etapami |
| Tworzenie `deals` | Juz istnieje z 18 kolumnami |
| Tworzenie `deal_products` | Juz istnieje |
| Tworzenie `deal_activities` | Juz istnieje |
| Nowe RLS policies | Istniejace sa bardziej granularne i lepsze |
| Edge Function `deal-setup` | RPC `seed_deal_stages_for_tenant` juz istnieje i dziala |
| Modyfikacja frontendu | Poza zakresem tego kroku (schemat DB) |
| Usuwanie istniejacych triggerow | `log_deal_activity` nadal potrzebny — frontend go uzywa |

## Bezpieczenstwo

- Nowa tabela `deal_history` ma RLS z `get_current_tenant_id()` -- izolacja tenantow
- Trigger `update_deal_value_from_products` jest `SECURITY DEFINER` -- moze updateowac deals nawet gdy RLS blokuje bezposredni update (potrzebne bo trigger odpala sie w kontekscie INSERT na deal_products)
- Trigger `track_deal_field_changes` jest `SECURITY DEFINER` z `SET search_path TO 'public'` -- bezpieczne wykonanie
- Istniejace RLS policies na `deals`, `deal_stages`, `deal_products`, `deal_activities` -- bez zmian

## Kolejnosc wykonania

Jedna migracja SQL w nastepujacej kolejnosci:

```text
1. ALTER TABLE deals -- nowe kolumny + constraint
2. ALTER TABLE deal_products -- discount_percent + przebudowa total_price
3. CREATE TABLE deal_history + RLS + indexy
4. CREATE FUNCTION + TRIGGER update_deal_value_from_products
5. CREATE FUNCTION + TRIGGER track_deal_field_changes
6. CREATE MATERIALIZED VIEW mv_deal_pipeline_stats + index + refresh function
7. CREATE INDEX (indexy na istniejacych tabelach)
```

Wszystko w jednej migracji -- atomowe, rollback-safe.
