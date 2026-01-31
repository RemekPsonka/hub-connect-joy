
## Plan: Profesjonalny Dashboard Planowania i Rozliczania Produkcji Ubezpieczeniowej

### Cel
Zbudować kompleksowy moduł do planowania finansowego brokera ubezpieczeniowego, który umożliwi:
- Ustalanie celów rocznych/kwartalnych/miesięcznych (KPI)
- Rejestrowanie realnej produkcji (składki, prowizje)
- Analizę odchyleń plan vs. realizacja
- Prognozowanie na podstawie terminów wygasania obcych polis

---

## Architektura Danych

### Nowe tabele w bazie danych

#### 1. `pipeline_kpi_targets` - Cele KPI
```sql
CREATE TABLE public.pipeline_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER, -- NULL = cel roczny, 1-12 = cel miesięczny
  
  -- Cele składkowe
  target_premium NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Cele prowizyjne (alternatywnie kalkulowane)
  target_commission NUMERIC(15,2),
  target_commission_rate NUMERIC(5,2), -- % średnia prowizja
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, year, month)
);
```

#### 2. `insurance_products` - Katalog produktów ubezpieczeniowych
```sql
CREATE TABLE public.insurance_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  
  code VARCHAR(50) NOT NULL, -- np. "MAJ-OGN", "OC-DZ"
  name VARCHAR(255) NOT NULL, -- np. "Ubezpieczenie od ognia"
  category VARCHAR(50) NOT NULL, -- property, liability, fleet, etc.
  subcategory VARCHAR(100), -- np. "all-risk", "named perils"
  
  default_commission_rate NUMERIC(5,2), -- domyślna % prowizji
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);
```

#### 3. `policy_production_records` - Rekordy produkcji (realna składka/prowizja)
```sql
CREATE TABLE public.policy_production_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  policy_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id),
  
  -- Identyfikacja okresu
  production_year INTEGER NOT NULL,
  production_month INTEGER NOT NULL, -- 1-12
  
  -- Produkt ubezpieczeniowy
  product_id UUID REFERENCES insurance_products(id),
  product_category VARCHAR(50), -- fallback jeśli brak produktu
  
  -- Składka
  forecasted_premium NUMERIC(15,2) DEFAULT 0,
  actual_premium NUMERIC(15,2) DEFAULT 0,
  
  -- Prowizja
  commission_rate NUMERIC(5,2), -- % prowizji
  forecasted_commission NUMERIC(15,2) DEFAULT 0,
  actual_commission NUMERIC(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, invoiced, paid
  invoice_date DATE,
  payment_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Rozszerzenie `insurance_policies`
```sql
ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS
  product_id UUID REFERENCES insurance_products(id),
  commission_rate NUMERIC(5,2),
  forecasted_premium NUMERIC(15,2),
  actual_premium NUMERIC(15,2),
  forecasted_commission NUMERIC(15,2),
  actual_commission NUMERIC(15,2);
```

---

## Nowe Komponenty UI

### Struktura plików

```
src/components/pipeline/
├── index.ts                       (eksporty - MOD)
├── PolicyPipelineDashboard.tsx    (MOD - nowy tab "Planowanie")
├── ProductionKPIEditor.tsx        (NOWY - edycja celów rocznych/mies.)
├── ProductionDashboard.tsx        (NOWY - główny dashboard produkcji)
├── ProductionChart.tsx            (NOWY - wykresy plan vs realizacja)
├── ProductionTable.tsx            (NOWY - tabela produkcji miesięcznej)
├── RenewalPotentialAnalysis.tsx   (NOWY - analiza potencjału obcych polis)
├── CommissionRatesEditor.tsx      (NOWY - edytor stawek prowizji wg ryzyka)
├── InsuranceProductsManager.tsx   (NOWY - zarządzanie katalogiem produktów)
└── AddProductionRecordModal.tsx   (NOWY - formularz dodawania produkcji)
```

### Główny Dashboard Produkcji

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Ofertowanie                                                            │
│  Zarządzaj procesem odnowień i monitoruj portfel polis                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [Dashboard] [Timeline] [Planowanie] [Raporty finansowe] [Produkty]     │
└─────────────────────────────────────────────────────────────────────────┘

                         ▼ Tab: Planowanie ▼

┌──────────────────────────────────────────────────────────────────────────┐
│                          FILTR OKRESU                                    │
│  [2026 ▼]  [Rok] [Kwartał] [Miesiąc]   [← Q1 →]   [Edytuj cele ⚙️]      │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ 📊 CEL SKŁADKI          │ │ 💰 REALNA SKŁADKA       │ │ 📈 CEL PROWIZJI         │ │ 💵 REALNA PROWIZJA      │
│ 20 000 000 PLN          │ │ 4 500 000 PLN           │ │ 3 000 000 PLN           │ │ 675 000 PLN             │
│ cel roczny              │ │ 22.5% celu              │ │ avg 15%                 │ │ 22.5% celu              │
│ ▓▓▓░░░░░░░░░░░░ 22.5%   │ │ +500k vs plan mies.     │ │ ▓▓▓░░░░░░░░░░░░ 22.5%   │ │ -25k vs plan mies.      │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ WYKRES: PLAN vs REALIZACJA - Składka miesięczna                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │  2.5M │            ░░░                                                                                  │ │
│ │       │     ██     ██     ░░                                                                            │ │
│ │  2.0M │     ██░░   ██░░   ░░                                                                            │ │
│ │       │  ██ ██░░   ██░░   ░░░░   ░░   ░░   ░░   ░░   ░░   ░░   ░░                                        │ │
│ │  1.5M │  ██ ██     ██     ░░░░   ░░   ░░   ░░   ░░   ░░   ░░   ░░                                        │ │
│ │       │  ██ ██     ██     ░░░░   ░░   ░░   ░░   ░░   ░░   ░░   ░░                                        │ │
│ │  1.0M │  ██        ██     ░░░░                                                                          │ │
│ │       └──Sty──Lut──Mar──Kwi──Maj──Cze──Lip──Sie──Wrz──Paź──Lis──Gru                                     │ │
│ │         ██ = Realizacja    ░░ = Plan                                                                    │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐ ┌──────────────────────────────────────────────────────┐
│ PRODUKCJA MIESIĘCZNA                    [+ Dodaj]    │ │ POTENCJAŁ ODNOWIEŃ OBCYCH POLIS                      │
├───────────────────────────────────────────────────────┤ ├──────────────────────────────────────────────────────┤
│ Miesiąc  │ Plan skł. │ Real skł. │ Δ      │ Prowizja │ │ Polisy wygasające w Q2 2026:                         │
├──────────┼───────────┼───────────┼────────┼──────────┤ │ ┌─────────────────────────────────────────────────┐  │
│ Styczeń  │ 1.5M      │ 2.0M      │ +500k  │ 300k     │ │ │ Firma ABC - Majątek          2.5M PLN   Kwi     │  │
│ Luty     │ 1.5M      │ 1.8M      │ +300k  │ 270k     │ │ │ Firma XYZ - OC               1.2M PLN   Maj     │  │
│ Marzec   │ 2.0M      │ -         │ -      │ -        │ │ │ Holding DEF - Flota          800k PLN   Cze     │  │
│ ...      │           │           │        │          │ │ └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘ │ SUMA POTENCJAŁU: 4.5M PLN = 22.5% celu rocznego      │
                                                          └──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PODZIAŁ PRODUKCJI WG RYZYKA                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Ryzyko      │ Składka plan │ Składka real │ Δ       │ Avg. prow. │ Prowizja real │                          │
├─────────────┼──────────────┼──────────────┼─────────┼────────────┼───────────────┤                          │
│ Majątek     │ 8.0M         │ 2.1M         │ -5.9M   │ 18%        │ 378k          │ ▓▓▓▓░░░░░░░ 26%          │
│ OC          │ 5.0M         │ 1.5M         │ -3.5M   │ 12%        │ 180k          │ ▓▓▓░░░░░░░░ 30%          │
│ Flota       │ 3.0M         │ 600k         │ -2.4M   │ 8%         │ 48k           │ ▓▓░░░░░░░░░ 20%          │
│ D&O         │ 2.0M         │ 200k         │ -1.8M   │ 25%        │ 50k           │ ▓░░░░░░░░░░ 10%          │
│ Cyber       │ 1.0M         │ 100k         │ -900k   │ 20%        │ 20k           │ ▓░░░░░░░░░░ 10%          │
│ Inne        │ 1.0M         │ 0            │ -1.0M   │ 15%        │ 0             │ ░░░░░░░░░░░ 0%           │
├─────────────┼──────────────┼──────────────┼─────────┼────────────┼───────────────┤                          │
│ RAZEM       │ 20.0M        │ 4.5M         │ -15.5M  │ 15%        │ 675k          │                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Nowe Hooki

### `usePipelineKPI.ts`
```typescript
// Zarządzanie celami KPI
export function usePipelineKPI(year: number) {
  // Pobieranie i edycja celów rocznych/miesięcznych
  return {
    targets: PipelineKPITarget[],
    yearlyTarget: PipelineKPITarget,
    monthlyTargets: PipelineKPITarget[],
    setYearlyTarget: (data) => void,
    setMonthlyTarget: (month, data) => void,
  }
}
```

### `useProductionRecords.ts`
```typescript
// Zarządzanie rekordami produkcji
export function useProductionRecords(year: number, month?: number) {
  return {
    records: ProductionRecord[],
    addRecord: (data) => void,
    updateRecord: (id, data) => void,
    deleteRecord: (id) => void,
    
    // Agregaty
    totalForecastedPremium: number,
    totalActualPremium: number,
    totalForecastedCommission: number,
    totalActualCommission: number,
    
    // Grupowanie
    byMonth: Record<number, ProductionRecord[]>,
    byCategory: Record<string, { premium: number, commission: number }>,
  }
}
```

### `useInsuranceProducts.ts`
```typescript
// Zarządzanie katalogiem produktów
export function useInsuranceProducts() {
  return {
    products: InsuranceProduct[],
    createProduct: (data) => void,
    updateProduct: (id, data) => void,
    deleteProduct: (id) => void,
    getProductsByCategory: (category) => InsuranceProduct[],
  }
}
```

### `useRenewalPotential.ts`
```typescript
// Analiza potencjału odnowień obcych polis
export function useRenewalPotential(dateRange: { start: Date, end: Date }) {
  return {
    foreignPoliciesInRange: PolicyWithCompany[],
    totalPotentialPremium: number,
    potentialByMonth: Record<string, number>,
    potentialByCategory: Record<string, number>,
  }
}
```

---

## Rozszerzenie typów (`src/components/renewal/types.ts`)

```typescript
// Nowe typy dla planowania produkcji
export interface PipelineKPITarget {
  id: string;
  tenant_id: string;
  year: number;
  month: number | null;
  target_premium: number;
  target_commission: number | null;
  target_commission_rate: number | null;
  notes: string | null;
}

export interface InsuranceProduct {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  category: PolicyType;
  subcategory: string | null;
  default_commission_rate: number | null;
  is_active: boolean;
}

export interface ProductionRecord {
  id: string;
  tenant_id: string;
  policy_id: string | null;
  company_id: string | null;
  production_year: number;
  production_month: number;
  product_id: string | null;
  product_category: PolicyType;
  forecasted_premium: number;
  actual_premium: number;
  commission_rate: number | null;
  forecasted_commission: number;
  actual_commission: number;
  status: 'pending' | 'invoiced' | 'paid';
  invoice_date: string | null;
  payment_date: string | null;
  notes: string | null;
}

// Rozszerzenie PolicyType o średnią prowizję
export const DEFAULT_COMMISSION_RATES: Record<PolicyType, number> = {
  property: 18,
  fleet: 8,
  do: 25,
  cyber: 20,
  liability: 12,
  life: 15,
  health: 10,
  other: 15,
};
```

---

## Modyfikacje istniejących plików

| Plik | Zmiany |
|------|--------|
| `PolicyPipelineDashboard.tsx` | Dodanie nowych tabów: "Planowanie", "Produkty" |
| `PolicyFinancialReports.tsx` | Integracja z danymi produkcji (zamiast hardcoded goal) |
| `useAllPolicies.ts` | Rozszerzenie o dane prowizyjne |

---

## Przepływ użytkownika

### 1. Ustalanie celów (początek roku)
1. Wejdź w tab "Planowanie"
2. Kliknij "Edytuj cele"
3. Wpisz cel roczny składki: 20M PLN
4. Wpisz średnią prowizję: 15%
5. System kalkuluje cel prowizji: 3M PLN
6. Opcjonalnie rozbij na cele miesięczne

### 2. Rejestrowanie produkcji (co miesiąc)
1. Kliknij "+ Dodaj produkcję"
2. Wybierz miesiąc: Styczeń 2026
3. Wybierz firmę/polisę (opcjonalnie)
4. Wybierz produkt z katalogu
5. Wpisz składkę realną: 2M PLN
6. System sugeruje prowizję na podstawie % produktu
7. Wpisz realną prowizję: 300k PLN

### 3. Analiza odchyleń
1. Dashboard pokazuje wykresy plan vs realizacja
2. Kolory wskazują nadwyżkę (zielony) lub niedobór (czerwony)
3. Tabela podsumowuje każdy miesiąc

### 4. Prognozowanie na podstawie odnowień
1. System analizuje obce polisy wygasające w badanym okresie
2. Pokazuje potencjalną składkę do przejęcia
3. Pomaga ocenić, czy cel jest osiągalny

---

## Podsumowanie zmian

| Plik | Typ | Opis |
|------|-----|------|
| **Baza danych** |
| Migracja SQL | NOWY | 3 nowe tabele + ALTER TABLE |
| **Komponenty** |
| `ProductionDashboard.tsx` | NOWY | Główny dashboard planowania |
| `ProductionKPIEditor.tsx` | NOWY | Modal edycji celów KPI |
| `ProductionChart.tsx` | NOWY | Wykresy Recharts |
| `ProductionTable.tsx` | NOWY | Tabela produkcji miesięcznej |
| `RenewalPotentialAnalysis.tsx` | NOWY | Analiza potencjału odnowień |
| `CommissionRatesEditor.tsx` | NOWY | Edytor stawek prowizji |
| `InsuranceProductsManager.tsx` | NOWY | Zarządzanie katalogiem |
| `AddProductionRecordModal.tsx` | NOWY | Formularz produkcji |
| `PolicyPipelineDashboard.tsx` | MOD | Nowe taby |
| **Hooki** |
| `usePipelineKPI.ts` | NOWY | Zarządzanie celami |
| `useProductionRecords.ts` | NOWY | Rekordy produkcji |
| `useInsuranceProducts.ts` | NOWY | Katalog produktów |
| `useRenewalPotential.ts` | NOWY | Analiza potencjału |
| **Typy** |
| `src/components/renewal/types.ts` | MOD | Nowe interfejsy |

---

## Korzyści biznesowe

1. **Kontrola celów** - Przejrzyste KPI na rok/kwartał/miesiąc
2. **Monitoring w czasie rzeczywistym** - Bieżąca analiza realizacji planu
3. **Prognozowanie** - Ocena potencjału na podstawie terminów odnowień
4. **Rozliczanie prowizji** - Śledzenie statusu płatności
5. **Analiza rentowności** - Które ryzyka przynoszą najwyższą prowizję
6. **Decyzje strategiczne** - Gdzie skupić wysiłki sprzedażowe
