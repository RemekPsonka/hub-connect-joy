

# Vitest + React Testing Library -- konfiguracja i unit testy

## Podsumowanie

Rozbudowa istniejacej infrastruktury testowej (vitest juz zainstalowany) o: brakujace utility (`formatCurrency`, `validations/deals`), mocki w setup, pliki testowe, i helper do renderowania z providerami.

## Stan obecny

| Element | Status |
|---------|--------|
| `vitest` + `jsdom` + `@testing-library/react` + `@testing-library/jest-dom` | Zainstalowane w devDependencies |
| `vitest.config.ts` | Istnieje -- potrzebuje dodania coverage config |
| `src/test/setup.ts` | Istnieje -- ma matchMedia mock, brakuje Supabase i localStorage mocka |
| `tsconfig.app.json` | OK -- ma `vitest/globals` |
| `package.json` scripts | Ma `test` i `test:watch` -- dodac `test:coverage` |
| `src/lib/formatCurrency.ts` | NIE ISTNIEJE -- trzeba stworzyc |
| `src/lib/validations/deals.ts` | NIE ISTNIEJE -- trzeba stworzyc |
| `@testing-library/user-event` | NIE zainstalowany -- dodac |

## Nowe pliki (8)

| Plik | Opis |
|------|------|
| `src/lib/formatCurrency.ts` | Utility: formatCurrency(amount, currency) + formatCompactCurrency(amount, currency) |
| `src/lib/validations/deals.ts` | Zod schemas: createDealSchema + updateDealSchema |
| `src/lib/__tests__/formatCurrency.test.ts` | 6+ testow dla formatowania walut |
| `src/lib/__tests__/logoCache.test.ts` | 8+ testow dla cache logo (extractDomain, get/set, clearExpired) |
| `src/lib/__tests__/validations.test.ts` | 7+ testow dla Zod walidacji deals |
| `src/hooks/__tests__/useCompanyLogo.test.ts` | 5+ testow dla hooka useCompanyLogo |
| `src/test/utils.tsx` | renderWithProviders helper z QueryClientProvider |
| (aktualizacja) `src/test/setup.ts` | Dodanie mockow Supabase + localStorage |

## Modyfikowane pliki (3)

| Plik | Zmiana |
|------|--------|
| `vitest.config.ts` | Dodanie sekcji coverage (v8 provider, include src/lib + src/hooks) |
| `src/test/setup.ts` | Dodanie vi.mock dla Supabase client + localStorage mock |
| `package.json` | Dodanie `test:coverage` script, dodanie `@testing-library/user-event` do devDependencies |

## Szczegoly techniczne

### 1. formatCurrency.ts -- nowy plik utility

```text
formatCurrency(amount: number | null | undefined, currency?: string): string
  - null/undefined -> zwraca '—' (em dash)
  - Intl.NumberFormat('pl-PL', { style: 'currency', currency })
  - Domyslna waluta: 'PLN'

formatCompactCurrency(amount: number | null | undefined, currency?: string): string
  - >= 1_000_000 -> "1.5M PLN"
  - >= 1_000 -> "50K PLN"
  - < 1_000 -> "500 PLN"
  - null/undefined -> '—'
```

### 2. validations/deals.ts -- Zod schemas

```text
createDealSchema:
  title: z.string().min(1).max(200)
  stage_id: z.string().uuid()
  value: z.number().min(0).optional()
  currency: z.enum(['PLN','EUR','USD','GBP','CHF']).default('PLN')
  probability: z.number().min(0).max(100).optional()
  contact_id: z.string().uuid().nullable().optional()
  company_id: z.string().uuid().nullable().optional()
  expected_close_date: z.string().nullable().optional()
  description: z.string().nullable().optional()
  source: z.string().nullable().optional()
  priority: z.enum(['low','medium','high','urgent']).default('medium')
  owner_id: z.string().uuid().nullable().optional()
  team_id: z.string().uuid().nullable().optional()

updateDealSchema:
  id: z.string().uuid()
  + partial z createDealSchema (all optional)
  + status: z.enum(['open','won','lost']).optional()
  + lost_reason: z.string().nullable().optional()
  + probability_override: z.number().min(0).max(100).nullable().optional()
  + won_at: z.string().nullable().optional()
```

### 3. setup.ts -- rozszerzenie o mocki

```text
Dodane:
1. vi.mock('@/integrations/supabase/client') -- mock supabase.from(), auth, functions
2. localStorage mock -- in-memory store z getItem, setItem, removeItem, clear, length, key
```

Istniejacy matchMedia mock zostaje bez zmian.

### 4. vitest.config.ts -- coverage

```text
Dodana sekcja test.coverage:
  provider: 'v8'
  reporter: ['text', 'html', 'lcov']
  include: ['src/lib/**', 'src/hooks/**']
  exclude: ['src/test/**', '**/*.d.ts']
```

### 5. Testy formatCurrency (6 testow)

```text
- formatCurrency: formats PLN, returns dash for null, handles zero, handles decimals, supports EUR/USD/GBP
- formatCompactCurrency: millions as M, thousands as K, small values normally
```

### 6. Testy logoCache (8+ testow)

```text
extractDomain:
  - full URL -> domain
  - bare domain -> domain
  - strips www
  - null/empty/undefined -> null
  - invalid URL -> null

logo cache:
  - uncached -> undefined
  - set + get -> URL
  - null cached -> null
  - expired -> undefined

getLogoUrl:
  - generates Clearbit URL with size
  - defaults to 64

clearExpiredLogos:
  - removes expired, keeps fresh
  - ignores non-logo keys
```

### 7. Testy validations (7+ testow)

```text
createDealSchema:
  - valid deal -> success
  - empty title -> fail
  - invalid currency -> fail
  - negative value -> fail
  - optional fields undefined -> success
  - invalid UUID -> fail
  - title >200 chars -> fail

updateDealSchema:
  - partial update with id -> success
  - probability_override range -> fail/success
  - lost_reason accepted
```

### 8. Testy useCompanyLogo (5 testow)

```text
  - no website -> initials, logoUrl null, not loading
  - single word -> correct initial
  - multiple words -> 2 initials
  - null name -> '?'
  - cached logo -> immediate return
  - cached null -> logoUrl null, not loading
```

### 9. test/utils.tsx

```text
createTestQueryClient() -- retry: false, gcTime: 0
renderWithProviders(ui, options?) -- wraps in QueryClientProvider
Export oba
```

## Kolejnosc wykonania

```text
1. Zainstaluj @testing-library/user-event (devDep)
2. Zaktualizuj vitest.config.ts (coverage)
3. Zaktualizuj package.json (test:coverage script)
4. Zaktualizuj src/test/setup.ts (mocki)
5. Stworz src/test/utils.tsx
6. Stworz src/lib/formatCurrency.ts
7. Stworz src/lib/validations/deals.ts
8. Stworz src/lib/__tests__/formatCurrency.test.ts
9. Stworz src/lib/__tests__/logoCache.test.ts
10. Stworz src/lib/__tests__/validations.test.ts
11. Stworz src/hooks/__tests__/useCompanyLogo.test.ts
12. Uruchom testy -> weryfikacja all pass
```

## Czego NIE robimy

| Element | Powod |
|---------|-------|
| Modyfikacja istniejacego kodu zrodlowego | Tylko dodajemy pliki testowe + config |
| Testy komponentow UI | Poza scope -- fokus na utils i hooks |
| Testy hookov z Supabase (useDeals, useContacts) | Wymagaja integracyjnego podejscia -- poza scope |
| Zmiana vite.config.ts | Vitest ma osobny config |
| Testy E2E (Playwright) | Osobna inicjatywa |

## Zabezpieczenia

- Mock Supabase w setup -> zero prawdziwych zapytan do bazy
- Mock localStorage -> zero efektow ubocznych
- Kazdy test file niezalezny (beforeEach clear)
- renderWithProviders z retry:false -> szybkie testy
- Wszystko offline -- brak network requests

