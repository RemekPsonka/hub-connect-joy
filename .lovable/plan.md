
# Plan: Zamiana mockowanych danych w StructureVisualization.tsx na dane z bazy

## Podsumowanie

Stworzenie nowego hooka `useInsuranceRiskBatch` do pobierania danych ubezpieczeniowych dla wielu firm jednocześnie, oraz integracja go z wizualizacją struktury grupy kapitałowej zamiast pustej mapy.

---

## Zakres zmian

### Krok 1: Nowy hook `src/hooks/useInsuranceRiskBatch.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StatusUbezpieczenia } from '@/components/insurance/types';
import type { InsuranceStatus } from '@/components/structure/types';
import type { Json } from '@/integrations/supabase/types';

interface RiskAssessmentRow {
  id: string;
  company_id: string;
  ryzyko_majatkowe: Json | null;
  ryzyko_oc: Json | null;
  ryzyko_flota: Json | null;
}

// Mapowanie StatusUbezpieczenia (baza) -> InsuranceStatus (wizualizacja)
function mapToInsuranceStatus(dbStatus: StatusUbezpieczenia | undefined): InsuranceStatus {
  switch (dbStatus) {
    case 'ubezpieczone':
      return 'insured';
    case 'luka':
      return 'gap';
    case 'nie_dotyczy':
      return 'unknown'; // N/D traktujemy jak unknown
    default:
      return 'unknown';
  }
}

// Agregacja statusów z wielu domen ryzyka
function aggregateStatus(row: RiskAssessmentRow): InsuranceStatus {
  const statuses: (StatusUbezpieczenia | undefined)[] = [];
  
  // Pobierz statusy z poszczególnych domen
  const majatkowe = row.ryzyko_majatkowe as { status?: StatusUbezpieczenia } | null;
  const oc = row.ryzyko_oc as { status?: StatusUbezpieczenia } | null;
  const flota = row.ryzyko_flota as { status?: StatusUbezpieczenia } | null;
  
  if (majatkowe?.status && majatkowe.status !== 'nie_dotyczy') statuses.push(majatkowe.status);
  if (oc?.status && oc.status !== 'nie_dotyczy') statuses.push(oc.status);
  if (flota?.status && flota.status !== 'nie_dotyczy') statuses.push(flota.status);
  
  // Priorytet: jeśli JAKAKOLWIEK domena ma lukę -> gap
  if (statuses.includes('luka')) return 'gap';
  
  // Jeśli wszystkie aktywne domeny ubezpieczone -> insured
  if (statuses.length > 0 && statuses.every(s => s === 'ubezpieczone')) return 'insured';
  
  // Brak danych lub wszystko N/D -> unknown
  return 'unknown';
}

export function useInsuranceRiskBatch(companyIds: string[]) {
  return useQuery({
    queryKey: ['insurance-risk-batch', ...companyIds.sort()],
    queryFn: async () => {
      if (companyIds.length === 0) return new Map<string, InsuranceStatus>();
      
      const { data, error } = await supabase
        .from('insurance_risk_assessments')
        .select('id, company_id, ryzyko_majatkowe, ryzyko_oc, ryzyko_flota')
        .in('company_id', companyIds);
      
      if (error) {
        console.error('Error fetching insurance assessments:', error);
        return new Map<string, InsuranceStatus>();
      }
      
      const result = new Map<string, InsuranceStatus>();
      
      for (const row of data || []) {
        const status = aggregateStatus(row);
        result.set(row.company_id, status);
      }
      
      return result;
    },
    enabled: companyIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minut
  });
}
```

---

### Krok 2: Modyfikacja `src/components/structure/StructureVisualization.tsx`

```text
PRZED (linie 30-34):
  // TODO: In future, fetch insurance assessments from insurance_risk_assessments table
  // For now, we'll use a mock map
  const insuranceAssessments = useMemo(() => {
    return new Map<string, InsuranceStatus>();
  }, []);

PO:
  // Zbierz wszystkie company_id do pobrania
  const companyIdsToFetch = useMemo(() => {
    const ids: string[] = [company.id]; // spółka matka
    members.forEach(member => {
      if (member.member_company_id) {
        ids.push(member.member_company_id);
      }
    });
    return ids;
  }, [company.id, members]);

  // Pobierz dane ubezpieczeniowe dla wszystkich firm
  const { data: insuranceAssessments = new Map(), isLoading: isLoadingInsurance } = 
    useInsuranceRiskBatch(companyIdsToFetch);
```

Dodanie importu:
```typescript
import { useInsuranceRiskBatch } from '@/hooks/useInsuranceRiskBatch';
```

Modyfikacja warunku ładowania (linia 53):
```text
PRZED:
  if (isLoading) {

PO:
  if (isLoading || isLoadingInsurance) {
```

---

## Mapowanie statusów

| Baza danych (`StatusUbezpieczenia`) | Wizualizacja (`InsuranceStatus`) | Kolor |
|-------------------------------------|----------------------------------|-------|
| `ubezpieczone` | `insured` | Niebieski (#3B82F6) |
| `luka` | `gap` | Czerwony (#EF4444) |
| `nie_dotyczy` | `unknown` | Szary (#6B7280) |
| Brak danych | `unknown` | Szary (#6B7280) |

---

## Logika agregacji statusu

Dla każdej firmy agregujemy statusy z 3 głównych domen ryzyka:
- `ryzyko_majatkowe.status`
- `ryzyko_oc.status`  
- `ryzyko_flota.status`

Reguły:
1. Jeśli JAKAKOLWIEK domena ma status `luka` -> wynik = `gap` (czerwony)
2. Jeśli WSZYSTKIE aktywne domeny mają `ubezpieczone` -> wynik = `insured` (niebieski)
3. W pozostałych przypadkach -> wynik = `unknown` (szary)

---

## Pliki do utworzenia/modyfikacji

| # | Plik | Akcja |
|---|------|-------|
| 1 | `src/hooks/useInsuranceRiskBatch.ts` | NOWY |
| 2 | `src/components/structure/StructureVisualization.tsx` | Modyfikacja |

---

## Szczegóły techniczne

### Query key
```typescript
['insurance-risk-batch', ...companyIds.sort()]
```
Sortowanie zapewnia stabilny cache key niezależnie od kolejności ID.

### Optymalizacja
- `staleTime: 5 * 60 * 1000` - dane ubezpieczeniowe zmieniają się rzadko
- `enabled: companyIds.length > 0` - nie wykonuj zapytania dla pustej listy
- Pojedyncze zapytanie z `IN` zamiast wielu osobnych

### Obsługa błędów
- Błąd zapytania: `console.error` + zwrot pustej mapy (fallback)
- Brak danych dla firmy: status `unknown` (szary węzeł)

---

## Co pozostaje bez zmian

- Hook `useInsuranceRisk` - dalej działa dla pojedynczej firmy
- Komponenty wizualizacji (`StructureCanvas`, węzły)
- Tabele w bazie danych
- Edge Functions
- Pozostałe komponenty
