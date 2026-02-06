

# Plan: Automatyczne logowanie aktywności Deal (Trigger)

## Cel
Dodanie triggera bazodanowego, który automatycznie rejestruje aktywności w tabeli `deal_activities` przy każdym INSERT lub UPDATE na tabeli `deals`. Eliminuje to potrzebę ręcznego logowania z poziomu frontendu.

---

## Analiza obecnego schematu

### Kolumny `deal_activities` (aktualne)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | UUID | PK, auto-generowane |
| `deal_id` | UUID | FK do deals |
| `activity_type` | TEXT | Typ aktywności |
| `description` | TEXT | Opis (nullable) |
| `old_value` | TEXT | Wartość przed zmianą |
| `new_value` | TEXT | Wartość po zmianie |
| `created_by` | UUID | FK do **directors** (nie auth.users!) |
| `created_at` | TIMESTAMPTZ | Data utworzenia |
| `details` | JSONB | Elastyczne metadane |

### Problem z proponowanym kodem

Proponowany trigger używa `user_id` (FK do auth.users), ale obecna tabela używa `created_by` (FK do directors). Musimy:

1. Dodać kolumnę `user_id` **LUB**
2. Dostosować trigger do używania `created_by` przez lookup do `directors`

**Rekomendacja:** Dodać kolumnę `user_id` dla pełnej zgodności z `auth.uid()` w triggerze + zachować `created_by` dla kompatybilności z istniejącym kodem.

---

## Krok 1: Migracja bazy danych

### 1.1 Dodanie kolumny `user_id`

```sql
ALTER TABLE public.deal_activities 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Indeks dla wydajności
CREATE INDEX IF NOT EXISTS idx_deal_activities_user 
ON public.deal_activities(user_id);
```

### 1.2 Funkcja triggera (dostosowana)

```sql
CREATE OR REPLACE FUNCTION public.log_deal_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_director_id UUID;
BEGIN
  -- Pobierz director_id dla aktualnego usera (do created_by)
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
    -- Zmiana etapu
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
    
    -- Zmiana wartości
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
    
    -- Wygrany deal
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
    
    -- Przegrany deal
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 Utworzenie triggera

```sql
DROP TRIGGER IF EXISTS trigger_log_deal_activity ON public.deals;

CREATE TRIGGER trigger_log_deal_activity
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.log_deal_activity();
```

---

## Krok 2: Aktualizacja TypeScript interface

Plik: `src/hooks/useDeals.ts`

```typescript
export interface DealActivity {
  id: string;
  deal_id: string;
  user_id: string | null;      // NOWE - auth.uid()
  activity_type: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Json | null;
  created_by: string | null;   // Zachowane dla kompatybilności
  created_at: string;
  creator?: { id: string; full_name: string } | null;
}
```

---

## Krok 3: Aktualizacja komponentu Timeline

Plik: `src/components/deals/DealActivitiesTimeline.tsx`

Rozszerzenie o wyświetlanie danych z `details` JSONB dla automatycznych aktywności:

- Dla `stage_change`: wyświetlić nazwy etapów (pobrane z cache)
- Dla `value_change`: sformatować wartości walutowe
- Dla `won`/`lost`: wyświetlić szczegóły

---

## Podsumowanie zmian

| Plik | Akcja |
|------|-------|
| Migracja SQL | **Utworzyć** - ALTER TABLE + funkcja + trigger |
| `src/hooks/useDeals.ts` | **Edytować** - rozszerzyć interface |
| `src/components/deals/DealActivitiesTimeline.tsx` | **Edytować** - obsługa nowych typów aktywności |

---

## Automatycznie logowane zdarzenia

| Zdarzenie | `activity_type` | Dane w `details` |
|-----------|-----------------|------------------|
| Nowy deal | `created` | title, value, currency, stage_id |
| Zmiana etapu | `stage_change` | from_stage_id, to_stage_id |
| Zmiana wartości | `value_change` | from_value, to_value, currency |
| Deal wygrany | `won` | value, currency, won_at |
| Deal przegrany | `lost` | reason |

---

## Korzyści

- Automatyczne śledzenie wszystkich kluczowych zmian w deals
- Brak potrzeby ręcznego logowania z frontendu dla podstawowych operacji
- Pełna historia zmian z metadanymi JSONB
- Zachowanie kompatybilności wstecznej (kolumna `created_by` nadal wypełniana)
- `SECURITY DEFINER` zapewnia działanie w kontekście uprawnień funkcji

