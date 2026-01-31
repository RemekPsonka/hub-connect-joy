
## Plan: Dodanie polisy bezpośrednio z panelu Domen Ryzyka

### Cel
Umożliwić użytkownikowi dodanie polisy bezpośrednio z panelu analizy ryzyka (np. przy domenie "Majątek i Przerwy w Działalności"). Gdy status jest "Ubezpieczone", pojawi się przycisk "Dodaj polisę" z uproszczonym formularzem zawierającym: datę początkową, sumę ubezpieczenia i szacowaną składkę. Po zapisie polisa trafia do harmonogramu, gdzie można uzupełnić pozostałe szczegóły.

---

### Architektura rozwiązania

Obecnie komponenty domen (PropertyDomain, LiabilityDomain, itd.) otrzymują tylko `data`, `onChange` i `operationalTypes`. Aby dodać polisę, potrzebujemy dostępu do `companyId` oraz funkcji tworzenia polisy.

**Podejście**: Stworzyć nowy komponent `QuickAddPolicyButton` wyświetlany wewnątrz każdej domeny, gdy status = "ubezpieczone". Komponent będzie zawierał uproszczony modal inline lub popover.

---

### Zmiany w plikach

| Plik | Typ | Opis |
|------|-----|------|
| `src/components/insurance/QuickAddPolicyButton.tsx` | NOWY | Przycisk z popoverem/dialogiem do szybkiego dodania polisy |
| `src/components/insurance/types.ts` | MOD | Rozszerzenie `DomainProps` o `companyId` i `onAddPolicy` |
| `src/components/insurance/domains/PropertyDomain.tsx` | MOD | Dodanie przycisku przy statusie "ubezpieczone" |
| `src/components/insurance/domains/LiabilityDomain.tsx` | MOD | Analogicznie |
| `src/components/insurance/domains/FleetDomain.tsx` | MOD | Analogicznie |
| `src/components/insurance/domains/SpecialtyDomain.tsx` | MOD | Dla każdego produktu (Cyber, D&O, CAR/EAR) |
| `src/components/insurance/domains/EmployeesDomain.tsx` | MOD | Dla produktów życie/zdrowie/podróże |
| `src/components/insurance/domains/FinancialDomain.tsx` | MOD | Dla gwarancji, trade credit, etc. |
| `src/components/insurance/RiskDomainAccordion.tsx` | MOD | Przekazanie `companyId` i `onAddPolicy` do domen |
| `src/components/insurance/RiskMatrixPanel.tsx` | MOD | Dodanie propsa `companyId` i `onAddPolicy` |
| `src/components/insurance/InsurancePanel.tsx` | MOD | Integracja z `useInsurancePolicies` i przekazanie funkcji tworzenia |

---

### Nowy komponent: `QuickAddPolicyButton.tsx`

Uproszczony formularz w popoverze:

```
┌─────────────────────────────────────────────┐
│  Dodaj polisę do harmonogramu               │
├─────────────────────────────────────────────┤
│  Data rozpoczęcia *   [01.02.2026     ]     │
│  (koniec: auto +1 rok)                      │
│                                             │
│  Suma ubezpieczenia   [45 000 000  ] PLN    │
│                                             │
│  Składka szacowana    [    120 000 ] PLN    │
│                                             │
│  ☐ Nasza polisa (obsługujemy)               │
│                                             │
│            [Anuluj]  [Dodaj do harmonogramu]│
└─────────────────────────────────────────────┘
```

**Logika:**
- Typ polisy automatycznie mapowany z domeny (np. PropertyDomain → `property`)
- Nazwa polisy generowana automatycznie (np. "Majątek - Auto")
- Data końcowa = data początkowa + 1 rok
- Po zapisie toast z linkiem "Otwórz harmonogram" → `/companies/{id}?tab=harmonogram`

---

### Mapowanie domen → typy polis

| Domena | PolicyType |
|--------|------------|
| PropertyDomain (majątek) | `property` |
| LiabilityDomain (OC) | `liability` |
| FleetDomain (flota) | `fleet` |
| SpecialtyDomain - Cyber | `cyber` |
| SpecialtyDomain - D&O | `do` |
| SpecialtyDomain - CAR/EAR | `other` |
| EmployeesDomain - Życie | `life` |
| EmployeesDomain - Zdrowie | `health` |
| EmployeesDomain - Podróże | `other` |
| FinancialDomain - Gwarancje | `other` |
| FinancialDomain - Trade Credit | `other` |

---

### Rozszerzenie interfejsu DomainProps

```typescript
export interface DomainProps<T> {
  data: T;
  onChange: (data: T) => void;
  operationalTypes: TypDzialnosci[];
  // Nowe pola dla szybkiego dodawania polis
  companyId?: string;
  onAddPolicy?: (data: {
    policy_type: string;
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

### Przykład integracji w PropertyDomain

```typescript
export function PropertyDomain({ data, onChange, operationalTypes, companyId, onAddPolicy }: DomainProps<RyzykoMajatkowe>) {
  // ... istniejący kod
  
  return (
    <div className="space-y-4">
      {/* Status toggle */}
      <InsuranceStatusToggle ... />
      
      {/* Quick Add Policy - widoczne gdy ubezpieczone */}
      {data.status === 'ubezpieczone' && companyId && onAddPolicy && (
        <QuickAddPolicyButton
          policyType="property"
          defaultPolicyName="Ubezpieczenie majątkowe"
          defaultSumInsured={data.suma_ubezp_majatek}
          onAdd={onAddPolicy}
        />
      )}
      
      {/* Reszta formularza */}
      {data.status !== 'nie_dotyczy' && (
        <div className="grid ...">
          ...
        </div>
      )}
    </div>
  );
}
```

---

### Przepływ danych

1. `InsurancePanel` tworzy instancję `useInsurancePolicies(company.id)` → dostaje `createPolicy`
2. `InsurancePanel` przekazuje do `RiskMatrixPanel`:
   - `companyId={company.id}`
   - `onAddPolicy={createPolicy.mutate}`
3. `RiskMatrixPanel` przekazuje do `RiskDomainAccordion`
4. `RiskDomainAccordion` przekazuje do każdej domeny
5. Domeny renderują `QuickAddPolicyButton` gdy status = "ubezpieczone"

---

### Podsumowanie zmian

| Plik | Zmiany |
|------|--------|
| `QuickAddPolicyButton.tsx` | Nowy komponent z Popover + formularzem |
| `types.ts` | Rozszerzenie `DomainProps` o `companyId`, `onAddPolicy` |
| `PropertyDomain.tsx` | Import + render `QuickAddPolicyButton` |
| `LiabilityDomain.tsx` | Jak wyżej |
| `FleetDomain.tsx` | Jak wyżej |
| `SpecialtyDomain.tsx` | 3x QuickAddPolicyButton (Cyber, D&O, CAR/EAR) |
| `EmployeesDomain.tsx` | 3x QuickAddPolicyButton (Życie, Zdrowie, Podróże) |
| `FinancialDomain.tsx` | 4x QuickAddPolicyButton (Gwarancje, Celne, Trade Credit, Ochrona) |
| `RiskDomainAccordion.tsx` | Props `companyId`, `onAddPolicy` |
| `RiskMatrixPanel.tsx` | Props `companyId`, `onAddPolicy` |
| `InsurancePanel.tsx` | Integracja z `useInsurancePolicies`, przekazanie funkcji |

---

### Korzyści

1. **Szybsze workflow** - dodanie polisy bez wychodzenia z analizy ryzyka
2. **Spójność danych** - suma ubezpieczenia z formularza ryzyka automatycznie przepisana do polisy
3. **Mniej kliknięć** - nie trzeba osobno otwierać harmonogramu
4. **Automatyczne nazewnictwo** - polisa od razu ma sensowną nazwę i typ
