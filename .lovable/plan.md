

# B-FIX.7 — Kafelek "Klient" w SalesHeader

## Cel
Dodać 5. kafelek **"Klient"** w `SalesHeader` na `/sgu/sprzedaz`, spójnie z kolumną **Klient** w `UnifiedKanban`. Kafelek pokazuje liczbę klientów i sumę oczekiwanego portfela (potencjał obszarów), tak samo liczoną jak w kanbanie i na `/sgu/klienci`.

## Zmiany

### 1. `src/components/sgu/headers/SalesHeader.tsx`
- Rozszerzyć typy: `onCardClick`/`activeKey` → dodać `'client'`.
- Wyliczyć `clientContacts = visibleContacts.filter(c => deriveStage(c) === 'client')`.
- Wyliczyć **sumę oczekiwanego portfela** dla klientów:
  ```ts
  const expectedPortfolioPLN = clientContacts.reduce((acc, c) =>
    acc + (((c.potential_property_gr ?? 0) + (c.potential_financial_gr ?? 0)
          + (c.potential_communication_gr ?? 0) + (c.potential_life_group_gr ?? 0)) / 100), 0);
  ```
  (identyczna formuła jak w `UnifiedKanban` dla kolumny `client` i jak w `useSGUClientsPortfolio.expectedPortfolioGr`).
- Dodać item: `{ key: 'client', label: 'Klienci', value: counts.client, icon: Star, tone: 'text-emerald-600' }` (ikona `Star` z lucide, kolor emerald — zgodnie z kolumną Klient w kanbanie `border-t-emerald-500`).
- Pod liczbą klientów wyrenderować małą sumę PLN (zamiast breakdown HOT/TOP/10x/COLD), np.:
  ```tsx
  <div className="text-[11px] text-muted-foreground tabular-nums">
    Σ oczek. {formatPLN(expectedPortfolioPLN)}
  </div>
  ```
  Użyć tego samego helpera formatującego co w `ClientsHeader.tsx` (jeśli istnieje — zaimportować; w przeciwnym razie inline `Intl.NumberFormat('pl-PL', { style:'currency', currency:'PLN', maximumFractionDigits:0 })`).
- Grid: `md:grid-cols-4` → `md:grid-cols-5`.
- Pole `breakdownByKey.client = null` (brak temperatur dla klientów).

### 2. `src/pages/sgu/SGUPipelineRoute.tsx`
- `SalesFilter` → dodać `'client'`.
- Logika `kanbanFilter`: pozostaje (`'snoozed'` → null), `'client'` przekazujemy normalnie do `UnifiedKanban`.

### 3. `src/components/sgu/sales/UnifiedKanban.tsx`
- Rozszerzyć `UnifiedKanbanProps.filter` o `'client'`.
- Filtr kolumn (jeśli używany) — sprawdzić istniejącą logikę `filter` (linie ~540) i upewnić się, że `'client'` pokazuje tylko kolumnę Klient. Jeśli obecnie filtr ogranicza widoczne kolumny do `[filter]`, to działa out-of-the-box po rozszerzeniu typu.

## Spójność danych
| Miejsce | Liczba klientów | Suma oczek. portfela |
|---|---|---|
| `SalesHeader` (NOWE) | `deriveStage === 'client'` | `Σ potential_*_gr / 100` |
| `UnifiedKanban` kolumna Klient (header) | jw. | jw. (już zaimplementowane) |
| `ClientsHeader` na `/sgu/klienci` (kafelek "Portfel oczekiwany") | n/a | jw. (`expectedPortfolioGr`) |

→ Te same kontakty, ta sama formuła, ta sama wartość.

## Pliki

| # | Plik | Akcja |
|---|---|---|
| 1 | `src/components/sgu/headers/SalesHeader.tsx` | EDIT — kafelek Klient + suma PLN, grid-cols-5 |
| 2 | `src/pages/sgu/SGUPipelineRoute.tsx` | EDIT — `SalesFilter` += `'client'` |
| 3 | `src/components/sgu/sales/UnifiedKanban.tsx` | EDIT — `filter` prop type += `'client'` |

## Poza zakresem
- Zmiany w `ClientsHeader` / `useSGUClientsPortfolio` (już mają tę sumę).
- Zmiana wyglądu kolumny Klient w kanbanie.
- Breakdown statusów klientów (active/inactive) — można dodać w osobnym sprincie.

## DoD

| Check | Stan |
|---|---|
| Header `/sgu/sprzedaz` pokazuje 5 kafelków: Prospekci, Leady, Ofertowanie, Klienci, Odłożone | ⬜ |
| Liczba w "Klienci" = liczba kart w kolumnie Klient kanbana | ⬜ |
| Suma PLN w "Klienci" = suma w nagłówku kolumny Klient = "Portfel oczekiwany" w `/sgu/klienci` | ⬜ |
| Klik "Klienci" filtruje kanban do kolumny Klient (toggle on/off) | ⬜ |
| `npx tsc --noEmit` exit 0 | ⬜ |

