

## Plan: Moduł Harmonogramu Strategii Odnowień (Renewal Strategy Timeline)

### Cel
Stworzenie modułu wizualizacji typu Gantt Chart do zarządzania złożonym harmonogramem odnawiania korporacyjnych polis ubezpieczeniowych, nie tylko datami wygaśnięcia, ale całym cyklem życia polisy.

---

## Architektura

### Biblioteki
Moduł wykorzysta istniejącą bibliotekę **recharts** (już zainstalowaną) do stworzenia niestandardowego wykresu Gantt. Nie wymaga dodatkowych zależności.

---

### Nowe pliki do utworzenia

| Plik | Cel |
|------|-----|
| `src/components/renewal/types.ts` | Typy dla polis i harmonogramu |
| `src/components/renewal/RenewalTimeline.tsx` | Główny komponent wizualizacji |
| `src/components/renewal/TimelineRow.tsx` | Pojedynczy wiersz (track) polisy |
| `src/components/renewal/PolicyBar.tsx` | Pasek reprezentujący aktywne pokrycie |
| `src/components/renewal/TimelineHeader.tsx` | Nagłówek z osią czasu (miesiące/kwartały) |
| `src/components/renewal/TimelineTooltip.tsx` | Tooltip z checklistą i szczegółami |
| `src/components/renewal/TimelineToolbar.tsx` | Pasek narzędzi (filtry, Critical Path, tryb ciemny) |
| `src/components/renewal/index.ts` | Eksporty modułu |
| `src/hooks/useInsurancePolicies.ts` | Hook do pobierania i zarządzania polisami |

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/company/CompanyFlatTabs.tsx` | Dodanie zakładki "Harmonogram" z ikoną CalendarClock |

---

## Model danych

### Nowa tabela: `insurance_policies`

```sql
CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Podstawowe dane polisy
  policy_type TEXT NOT NULL CHECK (policy_type IN ('property', 'fleet', 'do', 'cyber', 'liability', 'life', 'health', 'other')),
  policy_number TEXT,
  policy_name TEXT NOT NULL,
  insurer_name TEXT,
  broker_name TEXT,
  
  -- Daty
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status checklisty odnowienia
  renewal_checklist JSONB DEFAULT '{
    "data_update_requested": false,
    "market_tender_done": false,
    "negotiation_completed": false,
    "board_approval_obtained": false
  }'::jsonb,
  
  -- Dodatkowe informacje
  sum_insured NUMERIC,
  premium NUMERIC,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_insurance_policies_company ON insurance_policies(company_id);
CREATE INDEX idx_insurance_policies_end_date ON insurance_policies(end_date);

-- RLS
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access for insurance_policies"
  ON insurance_policies
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM directors WHERE user_id = auth.uid()));
```

---

## Struktura typów

```typescript
// src/components/renewal/types.ts

export type PolicyType = 'property' | 'fleet' | 'do' | 'cyber' | 'liability' | 'life' | 'health' | 'other';

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  property: 'Majątek',
  fleet: 'Flota',
  do: 'D&O',
  cyber: 'Cyber',
  liability: 'OC',
  life: 'Życie',
  health: 'Zdrowie',
  other: 'Inne',
};

export const POLICY_TYPE_COLORS: Record<PolicyType, string> = {
  property: '#3B82F6',   // blue
  fleet: '#10B981',      // emerald
  do: '#8B5CF6',         // violet
  cyber: '#F59E0B',      // amber
  liability: '#EF4444',  // red
  life: '#06B6D4',       // cyan
  health: '#EC4899',     // pink
  other: '#6B7280',      // gray
};

export interface RenewalChecklist {
  data_update_requested: boolean;
  market_tender_done: boolean;
  negotiation_completed: boolean;
  board_approval_obtained: boolean;
}

export interface InsurancePolicy {
  id: string;
  company_id: string;
  tenant_id: string;
  policy_type: PolicyType;
  policy_number?: string;
  policy_name: string;
  insurer_name?: string;
  broker_name?: string;
  start_date: string;
  end_date: string;
  renewal_checklist: RenewalChecklist;
  sum_insured?: number;
  premium?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  dangerZoneDays: number;       // 30 dni
  actionPhaseDays: number;      // 90 dni
  showCriticalPath: boolean;
  darkMode: boolean;
}
```

---

## Layout interfejsu

### Układ główny

```text
+-----------------------------------------------------------------------------------+
|  [Toolbar]                                                                         |
|  +Dodaj polisę+  | Widok: [Kwartały ▼] | [✓] Critical Path | [☾] Tryb ciemny     |
+-----------------------------------------------------------------------------------+
|  LEGENDA:  [■ Aktywna polisa]  [■ Faza działań (90 dni)]  [■ Strefa zagrożenia]  |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  POLISY     |  STY  |  LUT  |  MAR  |  KWI  |  MAJ  |  CZE  |  LIP  |  SIE  |    |
|-------------|-------|-------|-------|-------|-------|-------|-------|-------|    |
|  Majątek    |  [██████████████████POLISA████████████████]      |                  |
|             |                                    ↑ Action Phase ↑ Danger Zone    |
|             |                               [======ZIELONY======][CZERW]          |
|-------------|-------|-------|-------|-------|-------|-------|-------|-------|    |
|  Flota      |       [███████████████████POLISA██████████████████████]             |
|             |                                                [====][XXX]          |
|-------------|-------|-------|-------|-------|-------|-------|-------|-------|    |
|  D&O        |  [████POLISA████]  ← PRZETERMINOWANA (Critical Path podświetlone)   |
|             |                                                                      |
|-------------|-------|-------|-------|-------|-------|-------|-------|-------|    |
|  Cyber      |              [██████████████POLISA████████████████]                 |
|             |                                          [======][XXX]              |
+-----------------------------------------------------------------------------------+
```

---

## Komponenty wizualne

### 1. Pasek Polisy (PolicyBar)

```text
+--------------------------------------------------------------------------------+
|  [████████████████████ AKTYWNA POLISA (niebieski) ████████████████████████████]|
|                                        |← 90 dni →|← 30 →|                      |
|                                        [ZIELONY    ][CZERW ]                    |
|                                        Action Phase Danger                      |
+--------------------------------------------------------------------------------+
```

- **Polisa aktywna** (niebieski/kolor typu): Główny pasek reprezentujący okres pokrycia
- **Faza działań** (zielony nakładka): 90 dni przed wygaśnięciem - "Okno Przetargu i Negocjacji"
- **Strefa zagrożenia** (czerwony gradient): Ostatnie 30 dni przed wygaśnięciem

### 2. Interaktywny Tooltip

Po najechaniu na "Fazę działań":

```text
+--------------------------------+
|  FAZA DZIAŁAŃ (90 DNI)         |
|  Okno Przetargu i Negocjacji   |
+--------------------------------+
|  Checklist:                    |
|  [✓] Aktualizacja danych       |
|  [ ] Przetarg rynkowy          |
|  [ ] Negocjacje                |
|  [✓] Zgoda Zarządu             |
+--------------------------------+
|  Pozostało: 45 dni             |
|  Data wygaśnięcia: 2026-04-15  |
+--------------------------------+
```

### 3. Widok "Critical Path"

Toggle który podświetla polisy wymagające natychmiastowej uwagi:
- Polisy w "Strefie zagrożenia" (< 30 dni) bez kompletnej checklisty
- Polisy przeterminowane (end_date < today)
- Polisy w "Fazie działań" bez rozpoczętych kroków

---

## Paleta kolorów

### Tryb jasny
```typescript
const LIGHT_THEME = {
  policyBar: '#3B82F6',           // niebieski
  actionPhase: '#22C55E',         // zielony
  dangerZone: 'linear-gradient(to right, #FEE2E2, #EF4444)', // gradient czerwony
  criticalHighlight: '#FCD34D',   // żółty (highlight)
  gridLine: '#E5E7EB',
  text: '#374151',
  background: '#FFFFFF',
};
```

### Tryb ciemny
```typescript
const DARK_THEME = {
  policyBar: '#60A5FA',           // jasnoniebieski
  actionPhase: '#4ADE80',         // jasnozielony
  dangerZone: 'linear-gradient(to right, #7F1D1D, #DC2626)',
  criticalHighlight: '#FBBF24',
  gridLine: '#374151',
  text: '#F3F4F6',
  background: '#111827',
};
```

---

## Funkcjonalności

### 1. Dodawanie/Edycja polisy

Modal z formularzem:
- Typ polisy (select)
- Nazwa polisy
- Numer polisy (opcjonalnie)
- Ubezpieczyciel
- Broker
- Data rozpoczęcia / zakończenia
- Suma ubezpieczenia
- Składka
- Notatki

### 2. Zarządzanie checklistą

Kliknięcie w "Fazę działań" otwiera edytowalną checklistę:
- Checkbox: Aktualizacja danych klienta
- Checkbox: Przetarg rynkowy
- Checkbox: Negocjacje zakończone
- Checkbox: Zgoda Zarządu uzyskana

### 3. Widoki czasowe

Select do przełączania widoku osi X:
- **Miesiące**: Widok szczegółowy (domyślny)
- **Kwartały**: Widok strategiczny
- **Półrocza**: Widok planowania rocznego

### 4. Eksport

- **PDF**: Wizualizacja harmonogramu do prezentacji
- **Raport**: Lista polis z datami i statusami

---

## Hook: useInsurancePolicies

```typescript
export function useInsurancePolicies(companyId: string) {
  const queryClient = useQueryClient();
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  const { data: policies, isLoading } = useQuery({
    queryKey: ['insurance-policies', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('company_id', companyId)
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data as InsurancePolicy[];
    },
    enabled: !!companyId && !!tenantId,
  });

  const createPolicy = useMutation({ /* ... */ });
  const updatePolicy = useMutation({ /* ... */ });
  const updateChecklist = useMutation({ /* ... */ });
  const deletePolicy = useMutation({ /* ... */ });

  // Computed properties
  const criticalPolicies = useMemo(() => {
    if (!policies) return [];
    const today = new Date();
    return policies.filter(p => {
      const endDate = new Date(p.end_date);
      const daysLeft = differenceInDays(endDate, today);
      const checklist = p.renewal_checklist;
      
      // Critical if:
      // 1. Expired
      // 2. In danger zone without complete checklist
      // 3. In action phase with no started items
      return daysLeft < 0 || 
        (daysLeft <= 30 && !isChecklistComplete(checklist)) ||
        (daysLeft <= 90 && !hasChecklistStarted(checklist));
    });
  }, [policies]);

  return {
    policies,
    isLoading,
    createPolicy,
    updatePolicy,
    updateChecklist,
    deletePolicy,
    criticalPolicies,
  };
}
```

---

## Integracja z istniejącymi komponentami

### Modyfikacja CompanyFlatTabs

Dodanie zakładki "Harmonogram" między "Ubezpieczenia" a "Profil AI":

```typescript
// W tablicy tabs dodaj:
{ id: 'timeline', label: 'Harmonogram', icon: CalendarClock, always: true },
```

```tsx
<TabsContent value="timeline" className="mt-0">
  <RenewalTimeline companyId={company.id} />
</TabsContent>
```

---

## Podsumowanie zmian w plikach

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `src/components/renewal/types.ts` | **NOWY** | Typy dla polis i harmonogramu |
| `src/components/renewal/RenewalTimeline.tsx` | **NOWY** | Główny komponent Gantt chart |
| `src/components/renewal/TimelineRow.tsx` | **NOWY** | Wiersz dla typu polisy |
| `src/components/renewal/PolicyBar.tsx` | **NOWY** | Pasek wizualizacji polisy |
| `src/components/renewal/TimelineHeader.tsx` | **NOWY** | Nagłówek z osią czasu |
| `src/components/renewal/TimelineTooltip.tsx` | **NOWY** | Tooltip z checklistą |
| `src/components/renewal/TimelineToolbar.tsx` | **NOWY** | Pasek narzędzi |
| `src/components/renewal/AddPolicyModal.tsx` | **NOWY** | Modal dodawania polisy |
| `src/components/renewal/index.ts` | **NOWY** | Eksporty modułu |
| `src/hooks/useInsurancePolicies.ts` | **NOWY** | Hook zarządzania polisami |
| `src/components/company/CompanyFlatTabs.tsx` | Modyfikacja | Zakładka "Harmonogram" |

### Migracja SQL

Utworzenie tabeli `insurance_policies` z RLS.

---

## Przepływ użytkownika

1. Użytkownik wchodzi do widoku firmy → zakładka **"Harmonogram"**
2. Widzi wizualizację Gantt z aktualnymi polisami firmy
3. Może dodać nową polisę przyciskiem "Dodaj polisę"
4. Najeżdżając na "Fazę działań" widzi tooltip z checklistą
5. Kliknięcie checkboxa aktualizuje status (zapis do bazy)
6. Toggle "Critical Path" podświetla polisy wymagające uwagi
7. Przełącznik trybu ciemnego dla wysokiego kontrastu

---

## Estetyka

- Czysta, profesjonalna estetyka dashboardu
- Minimalistyczny UI zgodny z preferencjami użytkownika
- Przyciemnione, stonowane kolory (bez intensywnego niebieskiego jako głównego)
- Wysoki kontrast w trybie ciemnym dla lepszej czytelności
- Animowane przejścia dla lepszego UX

