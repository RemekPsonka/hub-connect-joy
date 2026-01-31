

## Plan: Moduł "Financial Exposure & Liability DNA" (DNA Ekspozycji Finansowej i Odpowiedzialności)

### Cel
Narzędzie analityczne do rozbicia struktury przychodów klienta na kategorie istotne dla oceny ryzyka odpowiedzialności cywilnej (OC ogólna, OC produktowa, OC zawodowa). Moduł umożliwia szybką wizualizację podziału terytorialnego i aktywności podczas spotkań z klientem.

---

## Architektura

### Nowe pliki do utworzenia

| Plik | Cel |
|------|-----|
| `src/components/liability/types.ts` | Typy dla struktury przychodów i ekspozycji OC |
| `src/components/liability/LiabilityDNAPanel.tsx` | Główny kontener modułu (dashboard) |
| `src/components/liability/RevenueInput.tsx` | "Big Number" - input całkowitych przychodów z selektorem waluty |
| `src/components/liability/TerritorialSplit.tsx` | Sekcja podziału terytorialnego z wykresem donut |
| `src/components/liability/ActivityRiskProfile.tsx` | Siatka toggleów typu działalności |
| `src/components/liability/SpecialExposureCards.tsx` | Karty Yes/No dla specjalnych ekspozycji |
| `src/components/liability/LiabilityLimitRecommender.tsx` | Wynik AI - rekomendacja limitu OC |
| `src/components/liability/TerritorialSlider.tsx` | Suwak procentowy z walidacją (suma = 100%) |
| `src/components/liability/index.ts` | Eksporty modułu |
| `src/hooks/useLiabilityDNA.ts` | Hook do zarządzania danymi |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/company/CompanyFlatTabs.tsx` | Dodanie zakładki "DNA OC" z ikoną Scale |

---

## Model danych

### Nowa tabela: `liability_exposure_profiles`

```sql
CREATE TABLE public.liability_exposure_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Total Revenue
  total_annual_revenue NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN' CHECK (currency IN ('PLN', 'EUR', 'USD')),
  
  -- Territorial Split (percentages, must sum to 100)
  territory_poland_pct NUMERIC DEFAULT 100,
  territory_eu_oecd_pct NUMERIC DEFAULT 0,
  territory_usa_canada_pct NUMERIC DEFAULT 0,
  territory_rest_world_pct NUMERIC DEFAULT 0,
  
  -- Activity Risk Profile (multi-select)
  activity_manufacturing BOOLEAN DEFAULT false,
  activity_services BOOLEAN DEFAULT false,
  activity_installation BOOLEAN DEFAULT false,
  activity_trading BOOLEAN DEFAULT false,
  
  -- Conditional: Services split
  services_advisory_pct NUMERIC,  -- vs manual work (100 - advisory = manual)
  
  -- Special Exposures
  exposure_aviation_auto_rail_offshore BOOLEAN DEFAULT false,
  exposure_ecommerce BOOLEAN DEFAULT false,
  b2b_vs_b2c_pct NUMERIC DEFAULT 50, -- 0 = full B2C, 100 = full B2B
  
  -- AI Recommendation
  ai_suggested_limit_eur NUMERIC,
  ai_recommendation_reason TEXT,
  ai_generated_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_liability_exposure_company ON public.liability_exposure_profiles(company_id);
CREATE INDEX idx_liability_exposure_tenant ON public.liability_exposure_profiles(tenant_id);

-- RLS
ALTER TABLE public.liability_exposure_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liability_exposure_tenant_access"
  ON public.liability_exposure_profiles
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND 
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    tenant_id = get_current_tenant_id()
  );

-- Trigger updated_at
CREATE TRIGGER update_liability_exposure_updated_at
  BEFORE UPDATE ON public.liability_exposure_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Struktura typów

```typescript
// src/components/liability/types.ts

export type Currency = 'PLN' | 'EUR' | 'USD';

export const CURRENCY_LABELS: Record<Currency, string> = {
  PLN: 'PLN',
  EUR: 'EUR', 
  USD: 'USD',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PLN: 'zł',
  EUR: '€',
  USD: '$',
};

export interface TerritorialSplit {
  poland_pct: number;
  eu_oecd_pct: number;
  usa_canada_pct: number;
  rest_world_pct: number;
}

export interface ActivityProfile {
  manufacturing: boolean;    // High Product Risk
  services: boolean;         // Prof. Indemnity Risk
  installation: boolean;     // General Liability Risk
  trading: boolean;          // Trading / Distribution
}

export interface SpecialExposures {
  aviation_auto_rail_offshore: boolean;
  ecommerce: boolean;
  b2b_vs_b2c_pct: number; // 0 = B2C, 100 = B2B
}

export interface LiabilityExposureProfile {
  id: string;
  company_id: string;
  tenant_id: string;
  
  // Revenue
  total_annual_revenue: number;
  currency: Currency;
  
  // Territorial
  territorial_split: TerritorialSplit;
  
  // Activity
  activity_profile: ActivityProfile;
  services_advisory_pct?: number;
  
  // Special exposures
  special_exposures: SpecialExposures;
  
  // AI recommendation
  ai_suggested_limit_eur?: number;
  ai_recommendation_reason?: string;
  ai_generated_at?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Risk Alerts based on inputs
export interface LiabilityRiskAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  trigger: string;
}

// Donut chart data
export interface TerritoryChartData {
  name: string;
  value: number;
  color: string;
  isDanger?: boolean;
}
```

---

## Layout interfejsu

### Dashboard Style Layout

```text
+-----------------------------------------------------------------------------------+
|  DNA EKSPOZYCJI FINANSOWEJ I ODPOWIEDZIALNOŚCI                      [Zapisz]     |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │  1. CAŁKOWITY PRZYCHÓD ROCZNY                                               │  |
|  │  ┌─────────────────────────────────────────────┐ ┌───────────┐              │  |
|  │  │ 125 000 000                                 │ │ PLN  ▼   │              │  |
|  │  └─────────────────────────────────────────────┘ └───────────┘              │  |
|  │  = 125M PLN (wyświetlone jako "Big Number")                                 │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                    |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │  2. PODZIAŁ TERYTORIALNY                                                    │  |
|  │                                                                              │  |
|  │  ┌────────────────────┐  ┌──────────────────────────────────────────────┐   │  |
|  │  │                    │  │  Polska/Kraj     [═══════════════] 70%      │   │  |
|  │  │    DONUT CHART     │  │                  = 87,5M PLN                │   │  |
|  │  │                    │  │                                              │   │  |
|  │  │   [Polska: 70%]    │  │  UE / OECD       [═══════░░░░░░░] 20%      │   │  |
|  │  │   [UE: 20%]        │  │                  = 25M PLN                  │   │  |
|  │  │   [USA: 5%] ⚠️     │  │                                              │   │  |
|  │  │   [Reszta: 5%]     │  │  🔴 USA/Kanada  [██░░░░░░░░░░░░] 5%        │   │  |
|  │  │                    │  │                  = 6,25M PLN  ← DANGER!     │   │  |
|  │  │                    │  │                                              │   │  |
|  │  └────────────────────┘  │  Reszta świata   [░░░░░░░░░░░░░░] 5%       │   │  |
|  │                          │                  = 6,25M PLN                │   │  |
|  │                          └──────────────────────────────────────────────┘   │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                    |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │  3. PROFIL RYZYKA DZIAŁALNOŚCI                                              │  |
|  │  "Czy przychody pochodzą z...?"                                             │  |
|  │                                                                              │  |
|  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│  |
|  │  │ ☑ Produkcja   │ │ ☑ Usługi/      │ │ ☐ Instalacje/  │ │ ☐ Handel/      ││  |
|  │  │   (Ryzyko     │ │   Doradztwo    │ │   Prace ręczne │ │   Dystrybucja  ││  |
|  │  │   Produktowe) │ │   (OC Zawod.)  │ │   (OC Ogólna)  │ │                ││  |
|  │  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘│  |
|  │                                                                              │  |
|  │  [WARUNKOWE: Jeśli Usługi wybrane]                                          │  |
|  │  Procent doradztwa vs prace manualne: [════════════░░░] 60%                 │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                    |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │  4. SPECJALNE PUNKTY EKSPOZYCJI                                             │  |
|  │                                                                              │  |
|  │  ┌─────────────────────────┐  ┌─────────────────────────┐                   │  |
|  │  │ Lotnictwo / Automotive  │  │ Sprzedaż online         │                   │  |
|  │  │ / Kolej / Offshore?     │  │ (e-Commerce)?           │                   │  |
|  │  │                         │  │                         │                   │  |
|  │  │  [TAK]  [NIE✓]          │  │  [TAK✓]  [NIE]          │                   │  |
|  │  │                         │  │  ⚠️ Ryzyko Cyber/RODO  │                   │  |
|  │  └─────────────────────────┘  └─────────────────────────┘                   │  |
|  │                                                                              │  |
|  │  B2B vs B2C:                                                                │  |
|  │  B2C [═══════════════════════════════════░░░░░░░░░░░░░░░░░░░░░] B2B        │  |
|  │       0%                     50%                              100%          │  |
|  │       ← Klienci indywidualni          Klienci biznesowi →                  │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
|                                                                                    |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │  5. REKOMENDACJA LIMITU AI                                        [🔄 AI]   │  |
|  │                                                                              │  |
|  │  ┌─────────────────────────────────────────────────────────────────────┐    │  |
|  │  │  SUGEROWANA SUMA GWARANCYJNA:                                      │    │  |
|  │  │                                                                     │    │  |
|  │  │  💰 5 000 000 EUR                                                   │    │  |
|  │  │                                                                     │    │  |
|  │  │  Uzasadnienie:                                                     │    │  |
|  │  │  • 5% ekspozycji na USA wymaga wyższych limitów                    │    │  |
|  │  │  • Działalność produkcyjna generuje ryzyko produktowe              │    │  |
|  │  │  • e-Commerce wymaga dodatkowego ubezpieczenia cyber              │    │  |
|  │  └─────────────────────────────────────────────────────────────────────┘    │  |
|  └─────────────────────────────────────────────────────────────────────────────┘  |
+-----------------------------------------------------------------------------------+
```

---

## Komponenty wizualne

### 1. RevenueInput (Big Number)

Duży input z:
- Formatowaniem walutowym (separatory tysięcy)
- Selector waluty (PLN/EUR/USD)
- Wyświetlanie sformatowanej wartości pod inputem (np. "125M PLN")

```typescript
interface RevenueInputProps {
  value: number;
  currency: Currency;
  onChange: (value: number) => void;
  onCurrencyChange: (currency: Currency) => void;
}
```

### 2. TerritorialSplit (Donut + Sliders)

Wykres donut z recharts + 4 suwaki procentowe:
- **Polska/Kraj** - zielony
- **UE/OECD** - niebieski
- **USA/Kanada** - CZERWONY (critical) - kolor zmienia się gdy > 0%
- **Reszta świata** - szary

Walidacja: suma musi = 100% (auto-normalizacja ostatniego suwaka)

```typescript
interface TerritorialSplitProps {
  split: TerritorialSplit;
  totalRevenue: number;
  currency: Currency;
  onChange: (split: TerritorialSplit) => void;
}
```

### 3. ActivityRiskProfile (Toggle Grid)

Siatka 2x2 toggleów z ikonami i opisami ryzyka:
- Manufacturing → OC Produktowe
- Services → OC Zawodowe (warunkowy slider advisory/manual)
- Installation → OC Ogólna
- Trading → Trading

```typescript
interface ActivityRiskProfileProps {
  profile: ActivityProfile;
  servicesAdvisoryPct?: number;
  onChange: (profile: ActivityProfile) => void;
  onServicesAdvisoryChange: (pct: number) => void;
}
```

### 4. SpecialExposureCards (Yes/No Cards)

Karty z przełącznikami Tak/Nie:
- **Aviation/Auto/Rail/Offshore** → Alert "High Severity"
- **e-Commerce** → Alert "Cyber Risk & Privacy"
- **B2B vs B2C** → Slider 0-100%

### 5. LiabilityLimitRecommender (AI Output)

Sekcja z:
- Przycisk "Wygeneruj rekomendację AI"
- Wyświetlenie sugerowanego limitu (duża liczba)
- Uzasadnienie w punktach

---

## Logika alertów ryzyka

```typescript
function generateRiskAlerts(profile: LiabilityExposureProfile): LiabilityRiskAlert[] {
  const alerts: LiabilityRiskAlert[] = [];
  
  // USA/Canada exposure
  if (profile.territorial_split.usa_canada_pct > 0) {
    alerts.push({
      id: 'usa-exposure',
      type: 'critical',
      message: `Ekspozycja na USA/Kanadę (${profile.territorial_split.usa_canada_pct}%) wymaga rozszerzonego zakresu OC i wyższych limitów`,
      trigger: 'territory_usa > 0%'
    });
  }
  
  // Aviation/Auto/Rail/Offshore
  if (profile.special_exposures.aviation_auto_rail_offshore) {
    alerts.push({
      id: 'high-severity',
      type: 'critical',
      message: 'Branże wysokiego ryzyka (lotnictwo/automotive/kolej/offshore) - wymagana specjalistyczna polisa',
      trigger: 'aviation_auto_rail_offshore = true'
    });
  }
  
  // e-Commerce
  if (profile.special_exposures.ecommerce) {
    alerts.push({
      id: 'cyber-privacy',
      type: 'warning',
      message: 'Sprzedaż online generuje ryzyko Cyber i RODO - rozważ ubezpieczenie Cyber',
      trigger: 'ecommerce = true'
    });
  }
  
  // Manufacturing + export
  if (profile.activity_profile.manufacturing && 
      (profile.territorial_split.eu_oecd_pct > 20 || profile.territorial_split.usa_canada_pct > 0)) {
    alerts.push({
      id: 'product-export',
      type: 'warning', 
      message: 'Produkcja z eksportem wymaga OC produktowego z rozszerzonym zakresem terytorialnym',
      trigger: 'manufacturing + export'
    });
  }
  
  return alerts;
}
```

---

## Algorytm rekomendacji limitu (AI lub reguły)

```typescript
function calculateSuggestedLimit(profile: LiabilityExposureProfile): number {
  let baseLimit = 1_000_000; // 1M EUR base
  
  // Revenue factor
  const revenueFactor = Math.log10(profile.total_annual_revenue / 1_000_000 + 1);
  baseLimit *= (1 + revenueFactor * 0.5);
  
  // USA/Canada multiplier (critical)
  if (profile.territorial_split.usa_canada_pct > 0) {
    const usaMultiplier = 1 + (profile.territorial_split.usa_canada_pct / 100) * 3;
    baseLimit *= usaMultiplier;
  }
  
  // High-risk industries
  if (profile.special_exposures.aviation_auto_rail_offshore) {
    baseLimit *= 2.5;
  }
  
  // Manufacturing
  if (profile.activity_profile.manufacturing) {
    baseLimit *= 1.5;
  }
  
  // e-Commerce
  if (profile.special_exposures.ecommerce) {
    baseLimit *= 1.2;
  }
  
  // Round to nice numbers
  return roundToNiceNumber(baseLimit);
}
```

---

## Hook: useLiabilityDNA

```typescript
export function useLiabilityDNA(companyId: string) {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['liability-dna', companyId],
    queryFn: async () => { /* fetch from liability_exposure_profiles */ },
    enabled: !!companyId && !!tenantId,
  });

  const saveProfile = useMutation({ /* upsert */ });
  
  const generateAIRecommendation = useMutation({
    mutationFn: async () => {
      // Call edge function or calculate locally
      const suggestedLimit = calculateSuggestedLimit(profile);
      const reason = generateRecommendationReason(profile);
      
      // Save to DB
      await supabase
        .from('liability_exposure_profiles')
        .update({
          ai_suggested_limit_eur: suggestedLimit,
          ai_recommendation_reason: reason,
          ai_generated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
      
      return { suggestedLimit, reason };
    },
  });

  // Computed: Risk alerts
  const riskAlerts = useMemo(() => 
    profile ? generateRiskAlerts(profile) : [],
    [profile]
  );

  return {
    profile,
    isLoading,
    saveProfile,
    generateAIRecommendation,
    riskAlerts,
  };
}
```

---

## Integracja z CompanyFlatTabs

Dodanie zakładki "DNA OC" po "Ekspozycja":

```typescript
// Import
import { Scale } from 'lucide-react';
import { LiabilityDNAPanel } from '@/components/liability';

// W tablicy tabs:
{ id: 'liability-dna', label: 'DNA OC', icon: Scale, always: true },

// TabsContent:
<TabsContent value="liability-dna" className="mt-0">
  <LiabilityDNAPanel companyId={company.id} />
</TabsContent>
```

---

## Paleta kolorów

```typescript
const TERRITORY_COLORS = {
  poland: '#22C55E',      // emerald-500 (safe)
  eu_oecd: '#3B82F6',     // blue-500 (normal)
  usa_canada: '#EF4444',  // red-500 (DANGER)
  rest_world: '#6B7280',  // gray-500 (neutral)
};

// USA slider turns red when > 0%
const getUSASliderStyle = (pct: number) => 
  pct > 0 
    ? 'bg-red-500 border-red-600' 
    : 'bg-gray-200 border-gray-300';
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `src/components/liability/types.ts` | **NOWY** | Typy dla ekspozycji finansowej |
| `src/components/liability/LiabilityDNAPanel.tsx` | **NOWY** | Główny kontener dashboard |
| `src/components/liability/RevenueInput.tsx` | **NOWY** | Big Number input + currency |
| `src/components/liability/TerritorialSplit.tsx` | **NOWY** | Donut chart + sliders |
| `src/components/liability/TerritorialSlider.tsx` | **NOWY** | Suwak procentowy z walidacją |
| `src/components/liability/ActivityRiskProfile.tsx` | **NOWY** | Siatka toggleów działalności |
| `src/components/liability/SpecialExposureCards.tsx` | **NOWY** | Karty Yes/No ekspozycji |
| `src/components/liability/LiabilityLimitRecommender.tsx` | **NOWY** | Sekcja rekomendacji AI |
| `src/components/liability/index.ts` | **NOWY** | Eksporty modułu |
| `src/hooks/useLiabilityDNA.ts` | **NOWY** | Hook CRUD + alertów |
| `src/components/company/CompanyFlatTabs.tsx` | Modyfikacja | Zakładka "DNA OC" |

### Migracja SQL

Utworzenie tabeli `liability_exposure_profiles` z RLS.

---

## Przepływ użytkownika

1. Użytkownik wchodzi do widoku firmy -> zakładka **"DNA OC"**
2. Wprowadza całkowity przychód roczny w "Big Number" input
3. Ustawia podział terytorialny suwakami (wykres donut aktualizuje się na żywo)
4. System automatycznie podświetla suwak USA/Kanada na czerwono gdy > 0%
5. Wybiera typy działalności z siatki toggleów
6. Odpowiada na pytania specjalnych ekspozycji (Yes/No)
7. Klika "Wygeneruj rekomendację AI"
8. System wyświetla sugerowany limit OC z uzasadnieniem
9. Alerty ryzyka pojawiają się dynamicznie na podstawie wyborów

---

## Estetyka

- Styl finansowego dashboardu z dużymi liczbami
- Wykresy donut dla wizualizacji podziałów procentowych
- Wysoki kontrast dla pola USA/Kanada (czerwony = niebezpieczeństwo)
- Stonowane kolory zgodne z preferencjami użytkownika
- Progress bary i suwaki dla intuicyjnej interakcji
- Karty z cieniami dla sekcji specjalnych ekspozycji

