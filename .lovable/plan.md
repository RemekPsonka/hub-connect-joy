
# Rozbudowa widoku statystyk + Modul Prowizje

## Czesc 1: Rozdzielenie Wartosc / Prowizja w kartach statystyk

Obecnie karty HOT/TOP/LEAD/COLD/Klienci pokazuja tylko "Wartosc". Dodamy druga linijke "Prowizja" pod wartoscia, obliczana z sumy `expected_commission` produktow per kategoria.

**Plik: `src/components/deals-team/TeamStats.tsx`**
- Rozszerzenie `categoryValues` o pole `commission` per kategoria
- Analogiczne rozszerzenie `clientTotalValue` o `clientTotalCommission`
- W kazdej karcie wyswietlenie dwoch linii: Wartosc + Prowizja (jesli > 0)

---

## Czesc 2: Nowy modul "Prowizje" -- nowa zakladka w Zespol Deals

### 2a. Nowa tabela w bazie danych

Tabela `deal_team_actual_commissions` do rejestrowania rzeczywistych skladek i prowizji:

```text
id              uuid PK
team_id         uuid FK -> deal_teams
team_contact_id uuid FK -> deal_team_contacts
client_product_id uuid FK -> deal_team_client_products (nullable)
tenant_id       uuid FK -> tenants
month_date      date         -- miesiac rozliczenia (np. 2026-02-01)
actual_premium  numeric      -- realna skladka otrzymana
actual_commission numeric    -- realna prowizja otrzymana
notes           text         -- komentarz
created_at      timestamptz
updated_at      timestamptz
```

RLS: tenant_id = auth.uid() tenant pattern (analogicznie do istniejacych tabel).

### 2b. Nowa zakladka "Prowizje" w dashboardzie

**Plik: `src/pages/DealsTeamDashboard.tsx`**
- Dodanie nowej opcji `viewMode = 'commissions'` do istniejacych zakladek
- Ikona: `Wallet` lub `Receipt`

### 2c. Nowy komponent `CommissionsTab`

**Plik: `src/components/deals-team/CommissionsTab.tsx`**

Glowny widok z trzema sekcjami:

1. **KPI karty** (gora):
   - Prognozowana prowizja (suma `expected_commission` z produktow klientow)
   - Otrzymana prowizja (suma `actual_commission` z nowej tabeli)
   - Roznica (prognoza - realne) z kolorowym wskaznikiem
   - % realizacji

2. **Tabela miesieczna** (srodek):
   - Wiersze = miesiace (12 miesiecy)
   - Kolumny: Miesiac | Prognoza skladki | Realna skladka | Prognoza prowizji | Realna prowizja | Roznica | %
   - Prognoza pobierana z `deal_team_revenue_forecasts` (piki miesieczne)
   - Prowizja prognozowana = prognoza skladki * sredni % prowizji
   - Realne wartosci z `deal_team_actual_commissions`
   - Mozliwosc edycji realnych wartosci inline (klikniecie w komorke)

3. **Szczegoly per klient** (dol):
   - Rozwijana lista klientow z ich produktami
   - Przy kazdym produkcie: prognoza vs realne
   - Kolorowe oznaczenie rozjezdzania sie (zielony = w normie, zolty = -10-20%, czerwony = >20% roznica)

### 2d. Hook `useCommissions`

**Plik: `src/hooks/useCommissions.ts`**

- `useActualCommissions(teamId, year)` -- pobieranie realnych danych
- `useUpsertActualCommission()` -- wstawianie/aktualizacja miesiecznych danych
- `useCommissionsSummary(teamId, year)` -- obliczanie podsumowania prognoza vs realne

### 2e. Eksport i rejestracja

**Plik: `src/components/deals-team/index.ts`** -- eksport `CommissionsTab`

---

## Podsumowanie zmian

| Element | Typ | Opis |
|---|---|---|
| `deal_team_actual_commissions` | Nowa tabela DB | Realne skladki i prowizje per miesiac/klient/produkt |
| `TeamStats.tsx` | Modyfikacja | Dodanie linii "Prowizja" w kartach |
| `DealsTeamDashboard.tsx` | Modyfikacja | Nowa zakladka "Prowizje" |
| `CommissionsTab.tsx` | Nowy komponent | Glowny widok modulu prowizji |
| `useCommissions.ts` | Nowy hook | Logika pobierania i zapisywania prowizji |
| `index.ts` | Modyfikacja | Eksport nowego komponentu |

## Logika kontrolna

System pozwoli na:
- Porownanie prognozowanych prowizji (z istniejacych prognoz klientow) z realnymi
- Identyfikacje rozjezdzania sie na poziomie: miesiaca, klienta, produktu
- Wpisywanie realnych skladek i prowizji per miesiac
- Wizualne oznaczenie odchylen (kolorystyka)
