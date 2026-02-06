

# Plan: Rozszerzenie tabeli deal_activities

## Cel
Rozszerzenie istniejącej tabeli `deal_activities` o kolumnę `details` (JSONB) oraz ujednolicenie typów aktywności zgodnie z nowym standardem.

---

## Analiza różnic

| Pole | Obecny schemat | Proponowany schemat | Decyzja |
|------|----------------|---------------------|---------|
| `id` | UUID | UUID | ✅ Bez zmian |
| `deal_id` | UUID (FK do deals) | UUID (FK do deals) | ✅ Bez zmian |
| `user_id` | ❌ Brak | UUID (FK do auth.users) | ⚠️ Używamy `created_by` (FK do directors) |
| `activity_type` | TEXT | TEXT | ✅ Bez zmian (rozszerzyć typy) |
| `description` | TEXT | ❌ Brak | **Zachować** (używane w kodzie) |
| `old_value` | TEXT | ❌ Brak | **Zachować** (używane w kodzie) |
| `new_value` | TEXT | ❌ Brak | **Zachować** (używane w kodzie) |
| `details` | ❌ Brak | JSONB | **Dodać** (elastyczne dane) |
| `created_by` | UUID (FK do directors) | ❌ Brak | **Zachować** (kompatybilność) |
| `created_at` | TIMESTAMPTZ | TIMESTAMPTZ | ✅ Bez zmian |

---

## Powód zachowania istniejących kolumn

Obecna implementacja w `src/hooks/useDeals.ts` używa kolumn:
- `description` - opis aktywności
- `old_value` / `new_value` - wartości przed/po zmianie
- `created_by` - referencja do dyrektora (nie auth.users)

Kolumna `details` JSONB zostanie dodana jako uzupełnienie dla elastycznych danych, które nie pasują do sztywnego schematu.

---

## Krok 1: Migracja bazy danych

```sql
-- Dodanie kolumny details do istniejącej tabeli
ALTER TABLE public.deal_activities
ADD COLUMN IF NOT EXISTS details JSONB;

-- Indeks dla szybkiego wyszukiwania w JSONB
CREATE INDEX IF NOT EXISTS idx_deal_activities_details 
ON public.deal_activities USING GIN (details);
```

---

## Krok 2: Aktualizacja TypeScript interface

Plik: `src/hooks/useDeals.ts`

Zmiana:
```typescript
export interface DealActivity {
  id: string;
  deal_id: string;
  activity_type: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  details: Record<string, unknown> | null;  // NOWE
  created_by: string | null;
  created_at: string;
  creator?: { id: string; full_name: string } | null;
}
```

---

## Krok 3: Aktualizacja hooka useCreateDealActivity

Rozszerzenie mutacji o obsługę `details`:

```typescript
export function useCreateDealActivity() {
  // ...
  return useMutation({
    mutationFn: async (activity: {
      deal_id: string;
      activity_type: string;
      description?: string;
      old_value?: string;
      new_value?: string;
      details?: Record<string, unknown>;  // NOWE
    }) => {
      // ...
    },
  });
}
```

---

## Krok 4: Aktualizacja komponentu DealActivitiesTimeline

Komponent może teraz wyświetlać dodatkowe dane z `details` dla typów aktywności, które tego wymagają.

---

## Typy aktywności (ujednolicone)

| Typ | Opis | Dane w details |
|-----|------|----------------|
| `created` | Deal utworzony | - |
| `stage_change` | Zmiana etapu | `{ from_stage, to_stage }` |
| `value_change` | Zmiana wartości | `{ from_value, to_value, currency }` |
| `won` | Deal wygrany | `{ won_reason }` |
| `lost` | Deal przegrany | `{ lost_reason }` |
| `note` | Notatka dodana | - |
| `call` | Rozmowa telefoniczna | `{ duration, outcome }` |
| `email` | Email wysłany | `{ subject }` |
| `meeting` | Spotkanie | `{ location, attendees }` |

---

## Pliki do modyfikacji

| Plik | Akcja |
|------|-------|
| Migracja SQL | **Utworzyć** - ALTER TABLE + indeks |
| `src/hooks/useDeals.ts` | **Edytować** - rozszerzyć interface i hook |
| `src/components/deals/DealActivitiesTimeline.tsx` | **Edytować** - obsługa details |

---

## Korzyści

- Elastyczna kolumna `details` JSONB dla dodatkowych danych
- Zachowanie kompatybilności wstecznej z istniejącym kodem
- Możliwość przechowywania dowolnych metadanych per aktywność
- Indeks GIN dla szybkiego wyszukiwania w JSONB

