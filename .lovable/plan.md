
# Plan: Optymalizacja cache React Query

## Cel
Dodanie `staleTime` do hooków danych aby zmniejszyć liczbę niepotrzebnych refetchów przy nawigacji między stronami.

---

## Analiza obecnego stanu

| Hook | Plik | Obecny staleTime |
|------|------|------------------|
| `useContacts` | `useContacts.ts` | brak (0) |
| `useContact` | `useContacts.ts` | brak (0) |
| `useContactGroups` | `useContacts.ts` | brak (0) |
| `useContactGroups` | `useContactGroups.ts` | brak (0) |
| `useCompaniesWithContacts` | `useCompanies.ts` | brak (0) |
| `useCompaniesList` | `useCompanies.ts` | brak (0) |
| `useTasks` | `useTasks.ts` | brak (0) |
| `useAnalytics` | `useAnalytics.ts` | N/A (useEffect) |

**Uwaga:** `useAnalytics` używa `useState` + `useEffect` zamiast `useQuery`, więc nie można dodać `staleTime`. To wymaga refaktoryzacji która jest poza zakresem tego zadania.

---

## Planowane zmiany

### 1. `src/hooks/useContacts.ts`

| Hook | staleTime | Uzasadnienie |
|------|-----------|--------------|
| `useContacts` | 30s | Lista kontaktów - często przeglądana |
| `useContact` | 30s | Szczegóły kontaktu |
| `useContactGroups` | 5 min | Grupy rzadko się zmieniają |
| `useContactStats` | 30s | Statystyki kontaktu |
| `useContactConsultations` | 30s | Historia konsultacji |
| `useContactTasks` | 15s | Zadania kontaktu |
| `useContactNeeds` | 30s | Potrzeby kontaktu |
| `useContactOffers` | 30s | Oferty kontaktu |
| `useContactActivityLog` | 30s | Log aktywności |

### 2. `src/hooks/useContactGroups.ts`

| Hook | staleTime |
|------|-----------|
| `useContactGroups` | 5 min |

### 3. `src/hooks/useCompanies.ts`

| Hook | staleTime | Uzasadnienie |
|------|-----------|--------------|
| `useCompaniesWithContacts` | 60s | Lista firm z kontaktami |
| `useCompaniesList` | 60s | Lista firm do filtrów |
| `useCompaniesForCapitalGroup` | 60s | Firmy dla grup kapitałowych |
| `useCompaniesWithRevenue` | 60s | Firmy z przychodami |
| `useCompanyContacts` | 30s | Kontakty firmy |
| `useCompany` | 60s | Szczegóły firmy |

### 4. `src/hooks/useTasks.ts`

| Hook | staleTime | Uzasadnienie |
|------|-----------|--------------|
| `useTasks` | 15s | Zadania - częste aktualizacje |
| `useTask` | 15s | Szczegóły zadania |
| `useContactTasksWithCross` | 15s | Zadania kontaktu |
| `usePendingTasksCount` | 15s | Licznik w nawigacji |

---

## Stałe czasowe

```typescript
// W każdym pliku dodamy komentarz z wyjaśnieniem
const STALE_TIME = {
  CONTACTS: 30 * 1000,        // 30 sekund
  COMPANIES: 60 * 1000,       // 60 sekund
  TASKS: 15 * 1000,           // 15 sekund
  GROUPS: 5 * 60 * 1000,      // 5 minut
};
```

---

## Pliki do modyfikacji

| # | Plik | Liczba hooków |
|---|------|---------------|
| 1 | `src/hooks/useContacts.ts` | 9 hooków |
| 2 | `src/hooks/useContactGroups.ts` | 1 hook |
| 3 | `src/hooks/useCompanies.ts` | 6 hooków |
| 4 | `src/hooks/useTasks.ts` | 4 hooki |

---

## Co pozostaje bez zmian

| Element | Powód |
|---------|-------|
| `useSemanticSearch` | Wyszukiwanie musi być zawsze aktualne |
| `useAIChat` | Czat AI musi być fresh |
| `useAnalytics` | Używa useEffect, nie useQuery |
| Wszystkie `useMutation` | Mutacje nie mają staleTime |
| `invalidateQueries` | Zachowujemy wymuszanie refetch po mutacjach |

---

## Przykład zmiany

```typescript
// PRZED:
return useQuery({
  queryKey: ['contacts', ...],
  queryFn: async () => { ... },
  enabled: !!tenantId,
});

// PO:
return useQuery({
  queryKey: ['contacts', ...],
  queryFn: async () => { ... },
  enabled: !!tenantId,
  staleTime: 30 * 1000, // 30 sekund
});
```

---

## Podsumowanie

| Metryka | Wartość |
|---------|---------|
| Pliki do modyfikacji | **4** |
| Hooki z dodanym staleTime | **20** |
| Edge Functions | bez zmian |
| Baza danych | bez zmian |
| Komponenty | bez zmian |
