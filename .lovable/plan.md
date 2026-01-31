
## Plan: Moduł "Multi-Site Exposure Manager" (Menadżer Ekspozycji Wielolokalizacyjnej)

### Cel
Strategiczne narzędzie do wizualizacji lokalizacji klienta i akumulacji wartości ubezpieczeniowej. Pozwala brokerowi szybko przechwycić listę lokalizacji, ich główną działalność i szacowane sumy ubezpieczenia podczas spotkań.

---

## Architektura

### Nowe pliki do utworzenia

| Plik | Cel |
|------|-----|
| `src/components/exposure/types.ts` | Typy dla lokalizacji i ekspozycji |
| `src/components/exposure/ExposureManager.tsx` | Główny kontener modułu |
| `src/components/exposure/ExposureMapView.tsx` | Widok mapy (placeholder) z pinezkami |
| `src/components/exposure/LocationCard.tsx` | Karta pojedynczej lokalizacji |
| `src/components/exposure/ValueSlider.tsx` | Suwak do szybkiej estymacji wartości |
| `src/components/exposure/ExposureSummaryFooter.tsx` | Podsumowanie TIV i alertów |
| `src/components/exposure/AddLocationModal.tsx` | Modal dodawania lokalizacji |
| `src/components/exposure/RiskAlerts.tsx` | Komponent alertów AI |
| `src/components/exposure/index.ts` | Eksporty modułu |
| `src/hooks/useExposureLocations.ts` | Hook do zarządzania lokalizacjami |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/company/CompanyFlatTabs.tsx` | Dodanie zakładki "Ekspozycja" z ikoną MapPinned |

---

## Model danych

### Nowa tabela: `exposure_locations`

```sql
CREATE TABLE public.exposure_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Lokalizacja
  name TEXT NOT NULL,              -- "Wrocław HQ", "Fabryka Poznań"
  address TEXT,
  city TEXT,
  lat NUMERIC(10, 7),              -- Współrzędne dla mapy
  lng NUMERIC(10, 7),
  
  -- Typ działalności (krytyczne dla oceny ryzyka)
  activity_type TEXT NOT NULL CHECK (
    activity_type IN ('production', 'warehouse', 'office', 'retail')
  ),
  
  -- Konstrukcja
  construction_type TEXT NOT NULL DEFAULT 'non_combustible' CHECK (
    construction_type IN ('non_combustible', 'combustible')
  ),
  
  -- Wartości (przechowywane w PLN)
  building_value NUMERIC DEFAULT 0,
  machinery_value NUMERIC DEFAULT 0,
  stock_value NUMERIC DEFAULT 0,
  stock_fluctuation BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_exposure_locations_company ON public.exposure_locations(company_id);
CREATE INDEX idx_exposure_locations_tenant ON public.exposure_locations(tenant_id);

-- RLS
ALTER TABLE public.exposure_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exposure_locations_tenant_access"
  ON public.exposure_locations
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND 
    tenant_id = get_current_tenant_id()
  );

-- Trigger updated_at
CREATE TRIGGER update_exposure_locations_updated_at
  BEFORE UPDATE ON public.exposure_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Struktura typów

```typescript
// src/components/exposure/types.ts

export type ActivityType = 'production' | 'warehouse' | 'office' | 'retail';
export type ConstructionType = 'non_combustible' | 'combustible';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  production: 'Produkcja',
  warehouse: 'Magazyn',
  office: 'Biuro',
  retail: 'Handel',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  production: 'bg-amber-500',
  warehouse: 'bg-emerald-500',
  office: 'bg-sky-500',
  retail: 'bg-violet-500',
};

export const CONSTRUCTION_TYPE_LABELS: Record<ConstructionType, string> = {
  non_combustible: 'Niepalna',
  combustible: 'Palna / Płyta warstwowa',
};

export interface ExposureLocation {
  id: string;
  company_id: string;
  tenant_id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  activity_type: ActivityType;
  construction_type: ConstructionType;
  building_value: number;
  machinery_value: number;
  stock_value: number;
  stock_fluctuation: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Obliczone wartości
export interface LocationExposure extends ExposureLocation {
  total_value: number;           // building + machinery + stock
  risk_tier: 'low' | 'medium' | 'high';  // based on total
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  message: string;
  locationId?: string;
}

// Progi dla kolorowania pinezek
export const VALUE_THRESHOLDS = {
  LOW: 10_000_000,      // < 10M = zielony
  MEDIUM: 50_000_000,   // < 50M = żółty
  // > 50M = czerwony
};
```

---

## Layout interfejsu

### Układ główny (Split View)

```text
+-----------------------------------------------------------------------------------+
|  [Toolbar]                                                                         |
|  +Dodaj lokalizację+  | Widok: [Lista ▼] / [Mapa]                                 |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +------------------------+  +--------------------------------------------------+ |
|  |                        |  |  KARTA LOKALIZACJI #1                            | |
|  |      MAPA              |  |  ┌─────────────────────────────────────────────┐ | |
|  |   (Placeholder)        |  |  │  📍 Wrocław HQ                               │ | |
|  |                        |  |  │  [Produkcja] [Magazyn] [Biuro] [Handel]      │ | |
|  |   📍 - Zielona (<10M)  |  |  │  ○ Niepalna  ● Palna                         │ | |
|  |   📍 - Żółta (<50M)    |  |  │  ─────────────────────────────────────────── │ | |
|  |   📍 - Czerwona (>50M) |  |  │  Budynek:    [═══════════░░░░] 25M    [📝]   │ | |
|  |                        |  |  │  Maszyny:    [════░░░░░░░░░░░] 8M     [📝]   │ | |
|  |                        |  |  │  Zapasy:     [══════════════░] 12M  [✓Fluk]  │ | |
|  |                        |  |  │  ─────────────────────────────────────────── │ | |
|  |                        |  |  │  SUMA EKSPOZYCJI: 45M PLN                    │ | |
|  +------------------------+  |  └─────────────────────────────────────────────┘ | |
|                              |                                                    | |
|                              |  KARTA LOKALIZACJI #2                            | |
|                              |  ...                                              | |
+-----------------------------------------------------------------------------------+
|  PODSUMOWANIE                                                                      |
|  Lokalizacje: 5  |  Łączny TIV: 187M PLN  |  Top ryzyko: Fabryka Poznań (78M)    |
+-----------------------------------------------------------------------------------+
|  ⚠️ ALERTY:                                                                       |
|  • Zapasy > Budynek przy Magazynie → Sprawdź systemy p.poż (tryskacze?)          |
|  • 5+ lokalizacji → Rozważ polisę Master z sumami zmiennymi                      |
+-----------------------------------------------------------------------------------+
```

---

## Komponenty wizualne

### 1. Karta Lokalizacji (LocationCard)

```text
┌─────────────────────────────────────────────────────────────────┐
│  📍 Wrocław HQ                                           [🗑️]  │
│  ul. Fabryczna 12, 50-001 Wrocław                              │
├─────────────────────────────────────────────────────────────────┤
│  Typ działalności:                                              │
│  [Produkcja✓] [Magazyn] [Biuro] [Handel]     ← Toggle badges   │
│                                                                 │
│  Konstrukcja:                                                   │
│  ○ Niepalna    ● Palna/Płyta warstwowa       ← Radio toggle    │
├─────────────────────────────────────────────────────────────────┤
│  SUWAKI WARTOŚCI:                                               │
│                                                                 │
│  Budynek         [═══════════════════░░░░░░░] 45M    [📝100M]  │
│                  0                         100M+                │
│                                                                 │
│  Maszyny/Sprzęt  [════════░░░░░░░░░░░░░░░░░] 15M    [📝50M]   │
│                  0                          50M+                │
│                                                                 │
│  Zapasy/Towary   [══════════════════░░░░░░░] 22M    [✓Fluktuacja] │
│                  0                          50M+                │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SUMA EKSPOZYCJI:  82 000 000 PLN                        │  │
│  │  ██████████████████████████████████████░░░░░░░░░░░░░░░░  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. ValueSlider (Suwak wartości)

Suwak z:
- Zakres logarytmiczny dla lepszego UX (0-100M+)
- Pole tekstowe do ręcznej edycji
- Wizualizacja progress bar
- Formatowanie walutowe (PLN)

```typescript
interface ValueSliderProps {
  label: string;
  value: number;
  max: number;               // 100M dla budynku, 50M dla maszyn/zapasów
  onChange: (value: number) => void;
  showFluctuation?: boolean;
  hasFluctuation?: boolean;
  onFluctuationChange?: (checked: boolean) => void;
}
```

### 3. Mapa (Placeholder)

Przygotowany pod przyszłą integrację z Leaflet/Google Maps:
- Pinezki kolorowane według wartości TIV
- Kliknięcie pinezki scrolluje do karty
- Legenda kolorów

```text
+------------------------------------------+
|                                          |
|        🗺️ Mapa Lokalizacji              |
|        (Placeholder)                     |
|                                          |
|   📍 Zielony: < 10M PLN                 |
|   📍 Żółty:   10-50M PLN                |
|   📍 Czerwony: > 50M PLN                |
|                                          |
|   [+ Dodaj lokalizację na mapie]        |
|                                          |
+------------------------------------------+
```

### 4. Alerty ryzyka (RiskAlerts)

Logika alertów:
- `stock_value > building_value && activity_type === 'warehouse'` → "Sprawdź systemy p.poż (tryskacze?)"
- `locations.length > 5` → "Rozważ polisę Master z sumami zmiennymi"
- `construction_type === 'combustible' && (building_value + machinery_value) > 20M` → "Ryzyko pożarowe - konstrukcja palna"

---

## Integracja z CompanyFlatTabs

Dodanie zakładki "Ekspozycja" po "Harmonogram":

```typescript
// W tablicy tabs dodaj:
{ id: 'exposure', label: 'Ekspozycja', icon: MapPinned, always: true },
```

```tsx
<TabsContent value="exposure" className="mt-0">
  <ExposureManager companyId={company.id} />
</TabsContent>
```

---

## Hook: useExposureLocations

```typescript
export function useExposureLocations(companyId: string) {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  const { data: locations, isLoading } = useQuery({
    queryKey: ['exposure-locations', companyId],
    queryFn: async () => { /* fetch from exposure_locations */ },
    enabled: !!companyId && !!tenantId,
  });

  const createLocation = useMutation({ /* insert */ });
  const updateLocation = useMutation({ /* update */ });
  const deleteLocation = useMutation({ /* delete */ });

  // Computed values
  const totalTIV = useMemo(() => 
    locations?.reduce((sum, loc) => 
      sum + loc.building_value + loc.machinery_value + loc.stock_value, 0
    ) || 0,
    [locations]
  );

  const topRiskLocation = useMemo(() => 
    locations?.reduce((max, loc) => {
      const total = loc.building_value + loc.machinery_value + loc.stock_value;
      return total > (max?.total || 0) ? { ...loc, total } : max;
    }, null),
    [locations]
  );

  const riskAlerts = useMemo(() => {
    const alerts: RiskAlert[] = [];
    
    if (locations && locations.length > 5) {
      alerts.push({
        id: 'master-policy',
        type: 'info',
        message: 'Rozważ polisę Master z sumami zmiennymi',
      });
    }
    
    locations?.forEach(loc => {
      if (loc.stock_value > loc.building_value && loc.activity_type === 'warehouse') {
        alerts.push({
          id: `fire-${loc.id}`,
          type: 'warning',
          locationId: loc.id,
          message: `${loc.name}: Sprawdź systemy p.poż (tryskacze?)`,
        });
      }
    });
    
    return alerts;
  }, [locations]);

  return {
    locations,
    isLoading,
    createLocation,
    updateLocation,
    deleteLocation,
    totalTIV,
    topRiskLocation,
    riskAlerts,
  };
}
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `src/components/exposure/types.ts` | **NOWY** | Typy lokalizacji i ekspozycji |
| `src/components/exposure/ExposureManager.tsx` | **NOWY** | Główny kontener z split view |
| `src/components/exposure/ExposureMapView.tsx` | **NOWY** | Placeholder mapy z pinezkami |
| `src/components/exposure/LocationCard.tsx` | **NOWY** | Karta lokalizacji z suwakami |
| `src/components/exposure/ValueSlider.tsx` | **NOWY** | Suwak wartości z manual override |
| `src/components/exposure/ExposureSummaryFooter.tsx` | **NOWY** | Footer z TIV i top risk |
| `src/components/exposure/AddLocationModal.tsx` | **NOWY** | Modal dodawania lokalizacji |
| `src/components/exposure/RiskAlerts.tsx` | **NOWY** | Panel alertów AI |
| `src/components/exposure/index.ts` | **NOWY** | Eksporty modułu |
| `src/hooks/useExposureLocations.ts` | **NOWY** | Hook CRUD + computed values |
| `src/components/company/CompanyFlatTabs.tsx` | Modyfikacja | Zakładka "Ekspozycja" |

### Migracja SQL

Utworzenie tabeli `exposure_locations` z RLS.

---

## Paleta kolorów pinezek

```typescript
function getPinColor(totalValue: number): string {
  if (totalValue < 10_000_000) return 'text-emerald-500';  // Zielony < 10M
  if (totalValue < 50_000_000) return 'text-amber-500';    // Żółty < 50M
  return 'text-red-500';                                    // Czerwony > 50M
}
```

---

## Przepływ użytkownika

1. Użytkownik wchodzi do widoku firmy → zakładka **"Ekspozycja"**
2. Widzi pustą mapę i przycisk "Dodaj lokalizację"
3. Klika "Dodaj lokalizację" → modal z nazwą i adresem
4. Po dodaniu pojawia się karta z suwakami wartości
5. Przeciąga suwaki lub wpisuje wartości ręcznie
6. System automatycznie oblicza sumę ekspozycji
7. Footer pokazuje łączny TIV i największą ekspozycję
8. Panel alertów wyświetla sugestie oparte na regułach

---

## Estetyka

- Czysta, profesjonalna estetyka dashboardu
- Karty z subtelnymi cieniami i zaokrągleniami
- Progress bary do wizualizacji rozkładu wartości
- Stonowane kolory zgodne z preferencjami użytkownika
- Responsywny layout: na mobile karty pod mapą

