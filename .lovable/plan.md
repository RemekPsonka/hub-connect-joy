

# Plan: Tabela Deal Products (Produkty w Deal)

## Cel
Dodanie możliwości zarządzania produktami/pozycjami w ramach pojedynczego deala, z automatycznym obliczaniem wartości.

---

## Analiza schematu

Proponowany schemat zawiera kolumnę `GENERATED ALWAYS AS`:

```sql
total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
```

Jest to wspierane przez PostgreSQL i automatycznie oblicza wartość wiersza.

---

## Krok 1: Migracja bazy danych

```sql
CREATE TABLE public.deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_products_deal ON deal_products(deal_id);
```

### RLS (Row Level Security)

Dostęp przez relację do `deals`:

```sql
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON public.deal_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.deals d 
      WHERE d.id = deal_id 
      AND d.tenant_id = public.get_current_tenant_id()
    )
  );
```

---

## Krok 2: TypeScript interface

Nowy interface w `src/hooks/useDeals.ts`:

```typescript
export interface DealProduct {
  id: string;
  deal_id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number; // obliczane automatycznie przez DB
  created_at: string;
}
```

---

## Krok 3: Hooki CRUD

Nowe hooki w `src/hooks/useDeals.ts`:

| Hook | Opis |
|------|------|
| `useDealProducts(dealId)` | Pobierz produkty dla deala |
| `useCreateDealProduct()` | Dodaj produkt |
| `useUpdateDealProduct()` | Edytuj produkt |
| `useDeleteDealProduct()` | Usuń produkt |

---

## Krok 4: Komponent UI

Nowy plik: `src/components/deals/DealProductsCard.tsx`

Funkcjonalności:
- Lista produktów z tabelą (Nazwa, Ilość, Cena jednostkowa, Suma)
- Przycisk "Dodaj produkt" otwierający inline formularz lub modal
- Możliwość edycji i usuwania pozycji
- Podsumowanie całkowitej wartości produktów
- Przycisk "Aktualizuj wartość deal" (synchronizacja z `deals.value`)

---

## Krok 5: Integracja z DealDetail.tsx

Dodanie komponentu `DealProductsCard` do strony szczegółów deala:

```tsx
<DealProductsCard 
  dealId={deal.id} 
  currency={deal.currency}
  onValueChange={(total) => handleUpdateDealValue(total)}
/>
```

---

## Pliki do utworzenia/modyfikacji

| Plik | Akcja |
|------|-------|
| Migracja SQL | **Utworzyć** - CREATE TABLE + RLS |
| `src/hooks/useDeals.ts` | **Edytować** - dodać interface i hooki |
| `src/components/deals/DealProductsCard.tsx` | **Utworzyć** - komponent UI |
| `src/components/deals/index.ts` | **Edytować** - eksport nowego komponentu |
| `src/pages/DealDetail.tsx` | **Edytować** - dodać sekcję produktów |

---

## Wizualizacja komponentu

```text
┌─────────────────────────────────────────────────────────┐
│ Produkty                                    [+ Dodaj]  │
├─────────────────────────────────────────────────────────┤
│ Nazwa          │ Ilość │ Cena jedn. │ Suma    │ Akcje  │
├─────────────────────────────────────────────────────────┤
│ Licencja CRM   │   10  │  1 000 PLN │ 10 000  │ ✏️ 🗑️  │
│ Wdrożenie      │    1  │ 15 000 PLN │ 15 000  │ ✏️ 🗑️  │
│ Szkolenie      │    2  │  2 500 PLN │  5 000  │ ✏️ 🗑️  │
├─────────────────────────────────────────────────────────┤
│                        RAZEM: │ 30 000 PLN            │
│                [Ustaw jako wartość deal]              │
└─────────────────────────────────────────────────────────┘
```

---

## Korzyści

- Szczegółowy breakdown wartości deala na produkty/usługi
- Automatyczne obliczanie sum dzięki `GENERATED COLUMN`
- Możliwość synchronizacji sumy produktów z wartością główną deala
- Lepsza kontrola nad wyceną i ofertowaniem

