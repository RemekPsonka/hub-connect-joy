
# Plan: Moduł Deals (Pipeline Sprzedażowy) - UI

## Cel
Stworzenie kompletnego interfejsu użytkownika dla zarządzania szansami sprzedaży (deals), zgodnie ze strukturą bazy danych już utworzoną w poprzednim kroku.

---

## Przegląd struktury

```text
src/
├── pages/
│   ├── Deals.tsx                    # Strona główna listy deals
│   └── DealDetail.tsx               # Szczegóły pojedynczego deal
├── components/deals/
│   ├── DealsHeader.tsx              # Nagłówek z filtrami i przyciskiem dodawania
│   ├── DealsTable.tsx               # Tabela z listą deals (dostarczona przez użytkownika)
│   ├── DealsKanban.tsx              # Widok Kanban (etapy jako kolumny)
│   ├── DealCard.tsx                 # Karta deal w widoku Kanban
│   ├── CreateDealModal.tsx          # Modal tworzenia nowego deal
│   ├── DealStageBadge.tsx           # Badge z kolorem etapu
│   └── DealActivitiesTimeline.tsx   # Timeline aktywności na deal
└── hooks/
    └── useDeals.ts                  # Hook z CRUD dla deals
```

---

## Krok 1: Hook useDeals.ts

Nowy plik: `src/hooks/useDeals.ts`

Funkcjonalności:
- `useDeals(filters)` - lista deals z paginacją i filtrami
- `useDeal(id)` - pojedynczy deal ze szczegółami
- `useDealStages()` - etapy pipeline dla tenant
- `useCreateDeal()` - mutacja tworzenia
- `useUpdateDeal()` - mutacja aktualizacji
- `useDeleteDeal()` - mutacja usuwania
- `useDealActivities(dealId)` - historia aktywności

Typy:
```typescript
export interface Deal {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  stage_id: string;
  probability: number;
  expected_close_date: string | null;
  owner_id: string | null;
  source: string | null;
  status: 'open' | 'won' | 'lost';
  won_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relacje
  contact?: { id: string; full_name: string } | null;
  company?: { id: string; name: string } | null;
  stage?: DealStage | null;
  owner?: { id: string; full_name: string } | null;
}

export interface DealStage {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  color: string;
  is_closed_won: boolean;
  is_closed_lost: boolean;
}
```

---

## Krok 2: Strona Deals.tsx

Nowy plik: `src/pages/Deals.tsx`

Funkcjonalności:
- Przełączanie widoku: Tabela / Kanban
- Filtry: szukaj, etap, status, owner
- Paginacja (w widoku tabeli)
- Modal dodawania nowego deal

---

## Krok 3: Komponenty UI

### DealsHeader.tsx
- Tytuł + badge z liczbą deals
- Przycisk "Dodaj deal"
- Przełącznik widoku (Tabela/Kanban)
- Pole wyszukiwania
- Filtr po etapie
- Filtr po statusie

### DealsTable.tsx (dostarczony przez użytkownika - do poprawy)
Poprawki w kodzie:
- Dodanie brakujących `<Table>` tagów
- Obsługa pustego stanu
- Paginacja

### DealsKanban.tsx
- Kolumny = etapy pipeline (z `useDealStages`)
- Karty = deals w danym etapie
- Drag & drop do zmiany etapu (opcjonalnie w przyszłości)

### DealCard.tsx
- Tytuł deal
- Wartość (sformatowana waluta)
- Kontakt/Firma
- Prawdopodobieństwo jako pasek
- Data zamknięcia

### CreateDealModal.tsx
- Formularz z polami:
  - Tytuł (wymagany)
  - Wartość + waluta
  - Kontakt LUB Firma (przynajmniej jedno)
  - Etap (dropdown)
  - Prawdopodobieństwo (slider 0-100%)
  - Oczekiwana data zamknięcia
  - Źródło (select: inbound/outbound/referral/partner)
  - Opis (textarea)

### DealStageBadge.tsx
- Badge z kolorem etapu
- Nazwa etapu

---

## Krok 4: Strona DealDetail.tsx

Nowy plik: `src/pages/DealDetail.tsx`

Sekcje:
- Nagłówek z tytułem i statusem
- Karty KPI: Wartość, Prawdopodobieństwo, Oczekiwany przychód
- Info o kontakcie/firmie (linki)
- Edycja inline pól
- Timeline aktywności
- Przyciski: "Wygrany", "Przegrany", "Edytuj", "Usuń"

---

## Krok 5: Routing w App.tsx

Dodanie nowych route:
```typescript
<Route path="/deals" element={<DirectorGuard><Deals /></DirectorGuard>} />
<Route path="/deals/:id" element={<DirectorGuard><DealDetail /></DirectorGuard>} />
```

---

## Krok 6: Seed domyślnych etapów

Przed użyciem modułu, tenant potrzebuje etapów pipeline. Wywołamy funkcję `seed_deal_stages_for_tenant` dla istniejącego tenanta.

---

## Pliki do utworzenia/modyfikacji

| Plik | Akcja |
|------|-------|
| `src/hooks/useDeals.ts` | **Utworzyć** - hook CRUD |
| `src/pages/Deals.tsx` | **Utworzyć** - strona listy |
| `src/pages/DealDetail.tsx` | **Utworzyć** - strona szczegółów |
| `src/components/deals/DealsHeader.tsx` | **Utworzyć** |
| `src/components/deals/DealsTable.tsx` | **Utworzyć** (poprawiona wersja) |
| `src/components/deals/DealsKanban.tsx` | **Utworzyć** |
| `src/components/deals/DealCard.tsx` | **Utworzyć** |
| `src/components/deals/CreateDealModal.tsx` | **Utworzyć** |
| `src/components/deals/DealStageBadge.tsx` | **Utworzyć** |
| `src/components/deals/DealActivitiesTimeline.tsx` | **Utworzyć** |
| `src/components/deals/index.ts` | **Utworzyć** - eksporty |
| `src/App.tsx` | **Edytować** - dodać route |
| `src/components/layout/AppSidebar.tsx` | **Edytować** - dodać link w menu |

---

## Efekt końcowy

Po wdrożeniu:
- Nowa pozycja "Deals" w sidebarze
- Widok listy z tabelą i Kanbanem
- Możliwość tworzenia, edycji, usuwania deals
- Śledzenie etapów pipeline
- Powiązanie z kontaktami i firmami
- Historia aktywności
