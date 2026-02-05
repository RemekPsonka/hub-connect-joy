
# Plan: TypeScript Strict Mode - Naprawa Bledow Kompilacji

## Cel
Naprawic bledy kompilacji TypeScript powstale po wlaczeniu strict mode w poprzednim kroku. Bledy dotycza 4 plikow komponentow i 2 hookow.

---

## Zmiana 1: src/components/ErrorBoundary.tsx

**Problem:** Typ `ErrorFallbackProps` nie jest kompatybilny z `FallbackProps` z react-error-boundary (error ma typ `unknown` zamiast `Error`)

**Linia 7-10** - Zmiana interfejsu:

```typescript
// USUNAC interfejs ErrorFallbackProps i uzyc FallbackProps z biblioteki
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
```

**Linia 12** - Zmiana komponentu:

```typescript
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // W renderze uzyc errorMessage zamiast error.message
```

---

## Zmiana 2: src/pages/Network.tsx

**Problem:** Ten sam problem z `FallbackProps` - lokalna funkcja `GraphErrorFallback` ma wlasny typ

**Linia 26** - Zmiana typu:

```typescript
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

function GraphErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // ...
```

---

## Zmiana 3: src/components/company/sections/RegistryDataSection.tsx

**Problem:** Parametry `source` i `note` w `.map()` maja implicit `any`

**Linia 8** - Dodac poprawny typ dla `data`:

```typescript
interface RegistryData {
  nip?: string;
  regon?: string;
  krs?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  sources?: string | string[];
  analysis_notes?: string | string[];
  data_source?: string;
}

interface RegistryDataSectionProps {
  data: RegistryData;
  dataSources?: DataSources;
}
```

**Linia 155** - Dodac typ do map:

```typescript
{sources.slice(0, 10).map((source: string, i: number) => (
```

**Linia 178** - Dodac typ do map:

```typescript
{analysisNotes.map((note: string, i: number) => (
```

---

## Zmiana 4: src/components/insurance/RiskDomainAccordion.tsx

**Problem:** `onAddPolicy` ma typ `QuickPolicyData` z `PolicyType`, ale `DomainProps` definiuje `policy_type` jako `string`

**Rozwiazanie:** Zmodyfikowac typ w `DomainProps` lub uzyc type assertion

**Zmiana w src/components/insurance/types.ts**, linia 189-197:

```typescript
import type { PolicyType } from '@/components/renewal/types';

export interface DomainProps<T> {
  data: T;
  onChange: (data: T) => void;
  operationalTypes: TypDzialnosci[];
  companyId?: string;
  onAddPolicy?: (data: {
    policy_type: PolicyType;  // Zmiana z string na PolicyType
    policy_name: string;
    start_date: string;
    end_date: string;
    sum_insured?: number;
    premium?: number;
    is_our_policy?: boolean;
  }) => void;
}
```

---

## Zmiana 5: src/hooks/useBusinessInterview.ts

**Problem:** Element has implicit 'any' type because expression can't index union type

**Linia 233** - Naprawic indeksowanie:

```typescript
// PRZED:
const items = (current[itemType] as any[]) || [];

// PO:
const currentData = current as Record<string, unknown>;
const items = (currentData[itemType] as Array<{ id: string; [key: string]: unknown }>) || [];
```

---

## Zmiana 6: src/hooks/useConnections.ts

**Problem:** `contact_a_id` moze byc `null` ale typ `Connection` wymaga `string`

**Linia 166 i 181** - Dodac filtrowanie null:

```typescript
// Linia 166 - Filtrowac przed mapowaniem:
const validConnections = (connections || []).filter(
  (conn): conn is typeof conn & { contact_a_id: string; contact_b_id: string } =>
    conn.contact_a_id !== null && conn.contact_b_id !== null
);

const otherContactIds = validConnections.map((conn) =>
  conn.contact_a_id === contactId ? conn.contact_b_id : conn.contact_a_id
);

// Linia 181:
return validConnections.map((conn) => {
  // ...
});
```

---

## Podsumowanie zmian

| Plik | Problem | Rozwiazanie |
|------|---------|-------------|
| `ErrorBoundary.tsx` | FallbackProps type mismatch | Uzyc typu z biblioteki + type guard dla error |
| `Network.tsx` | FallbackProps type mismatch | Uzyc typu z biblioteki + type guard dla error |
| `RegistryDataSection.tsx` | Implicit any w map() | Dodac typy do parametrow + interface dla data |
| `RiskDomainAccordion.tsx` | PolicyType vs string | Zmienic DomainProps na PolicyType |
| `useBusinessInterview.ts` | Cannot index union type | Type assertion z Record |
| `useConnections.ts` | null vs string | Type guard filter |

---

## Wazne uwagi

1. Wszystkie zmiany dotycza tylko typow - logika biznesowa pozostaje bez zmian
2. Uzywamy type guards zamiast type assertions gdzie to mozliwe
3. Import `FallbackProps` z react-error-boundary zapewnia kompatybilnosc
4. Po tych zmianach kompilacja powinna przejsc bez bledow
