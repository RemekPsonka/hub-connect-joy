

# Plan: Aktualizacja schematu tabeli deal_stages

## Cel
Rozszerzenie istniejącej tabeli `deal_stages` o dodatkowe pola i automatyczne tworzenie etapów dla nowych tenantów.

---

## Analiza różnic

| Pole | Obecnie | Proponowane | Decyzja |
|------|---------|-------------|---------|
| `description` | ❌ | ✅ | Dodać |
| `probability_default` | ❌ | ✅ | Dodać |
| `is_active` | ❌ | ✅ | Dodać |
| `updated_at` | ❌ | ✅ | Dodać |
| `is_closed_won` | ✅ | ❌ | **Zachować** (używane w kodzie) |
| `is_closed_lost` | ✅ | ❌ | **Zachować** (używane w kodzie) |
| Trigger na `tenants` | ❌ | ✅ | Dodać |

---

## Krok 1: Migracja bazy danych

```sql
-- Dodanie nowych kolumn do deal_stages
ALTER TABLE public.deal_stages
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS probability_default INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger dla updated_at
CREATE TRIGGER update_deal_stages_updated_at
  BEFORE UPDATE ON public.deal_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Funkcja tworzenia domyślnych etapów przy nowym tenancie
CREATE OR REPLACE FUNCTION public.create_default_deal_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deal_stages 
    (tenant_id, name, color, position, probability_default, is_closed_won, is_closed_lost) 
  VALUES
    (NEW.id, 'Lead', '#6366f1', 1, 10, false, false),
    (NEW.id, 'Kwalifikacja', '#8b5cf6', 2, 25, false, false),
    (NEW.id, 'Propozycja', '#ec4899', 3, 50, false, false),
    (NEW.id, 'Negocjacje', '#f59e0b', 4, 75, false, false),
    (NEW.id, 'Zamknięty - Wygrany', '#10b981', 5, 100, true, false),
    (NEW.id, 'Zamknięty - Przegrany', '#ef4444', 6, 0, false, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabeli tenants
CREATE TRIGGER trigger_create_default_deal_stages
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_deal_stages();
```

---

## Krok 2: Aktualizacja typów TypeScript

Plik: `src/hooks/useDeals.ts`

```typescript
export interface DealStage {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;      // nowe
  position: number;
  color: string;
  probability_default: number;      // nowe
  is_active: boolean;               // nowe
  is_closed_won: boolean;
  is_closed_lost: boolean;
  created_at: string;
  updated_at: string;               // nowe
}
```

---

## Krok 3: Usunięcie ręcznego seedowania

Ponieważ trigger automatycznie utworzy etapy dla nowego tenanta, funkcja `seed_deal_stages_for_tenant` może zostać zachowana jako backup dla istniejących tenantów bez etapów.

---

## Podsumowanie zmian

| Plik / Zasób | Akcja |
|--------------|-------|
| Migracja SQL | **Utworzyć** - ALTER TABLE + trigger |
| `src/hooks/useDeals.ts` | **Edytować** - rozszerzyć interface DealStage |

---

## Korzyści

- Nowe pola `description` i `probability_default` pozwalają na dokładniejszą konfigurację etapów
- `is_active` umożliwia dezaktywację etapów bez usuwania
- Automatyczny trigger przy tworzeniu tenanta eliminuje potrzebę ręcznego seedowania
- Zachowanie `is_closed_won`/`is_closed_lost` zapewnia kompatybilność z istniejącym kodem

