

# Etap 3: Spojne wykresy i dashboardy

## Cel

Dodac wizualne wykresy (recharts) do modulu lejka sprzedazowego, aby dane z Kanbana, Ofertowania, Klientow i harmonogramow platnosci byly przedstawione graficznie w sposob spojny. Rozszerzyc TeamStats o kartke "Ofertowanie" i dodac wykresy do zakladek.

## Co sie zmieni dla uzytkownika

1. **TeamStats** -- nowa karta "Ofertowanie" (emerald, ikona Briefcase) z wartoscia i liczba kontaktow w ofertowaniu
2. **ClientsSummaryView** -- dodanie wykresu slupkowego (BarChart) prognozy miesiecznej zamiast samych kafelkow + wykres kolowy kategorii produktow
3. **OfferingTab** -- dodanie wykresu liniowego (AreaChart) timeline platnosci na najblizsze 24 miesiace, z rozroznieniem typow (cykliczne, jednorazowe, lump sum)
4. **TeamStats** -- wykres lejka konwersji (COLD -> LEAD -> TOP -> HOT -> OFERTOWANIE -> KLIENT) z liczbami na kazdym etapie

## Szczegoly techniczne

### 1. TeamStats -- karta Ofertowanie

Plik: `src/components/deals-team/TeamStats.tsx`

Dodanie karty miedzy "Klienci" a "Poszukiwani":
- Ikona: Briefcase (emerald)
- Liczba kontaktow w kategorii `offering`
- Wartosc produktow z ofertowania
- Prowizja z ofertowania

Rozszerzenie `categoryValues` o klucz `offering` (obecnie brakuje).
Zmiana gridu z `grid-cols-6` na `grid-cols-7`.

### 2. OfferingTab -- wykres timeline platnosci

Plik: `src/components/deals-team/OfferingTab.tsx`

Dodanie nad lista kontaktow wykresu AreaChart (recharts):
- Os X: miesiace (24 do przodu)
- Os Y: kwoty PLN
- 3 serie danych: "Cykliczne" (niebieskie), "Jednorazowe" (fioletowe), "Dodatkowe/lump sum" (zolte)
- Agregacja `payments` po miesiacu i typie
- Wykorzystanie istniejacego ChartContainer z `src/components/ui/chart.tsx`

### 3. ClientsSummaryView -- wykres slupkowy prognozy

Plik: `src/components/deals-team/ClientsSummaryView.tsx`

Zamiana statycznych kafelkow prognozy miesiecznej na wykres BarChart:
- Os X: miesiace
- Os Y: kwoty
- Tooltip z formatowaniem walutowym
- Zachowanie kafelkow kategorii produktow (z kolorami) jako mini-wykres kolowy (PieChart)

### 4. Nowy komponent: FunnelChart

Plik: `src/components/deals-team/FunnelConversionChart.tsx` (NOWY)

Wizualizacja lejka konwersji:
- Uzycie BarChart z recharts (poziomy) jako zastepnik funnela
- Etapy: COLD -> LEAD -> TOP -> HOT -> OFERTOWANIE -> KLIENT
- Kazdy etap z kolorem odpowiadajacym kolumnce Kanban
- Wyswietlany na dole TeamStats jako pelna szerokosc

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/TeamStats.tsx` | Karta Ofertowanie + FunnelChart na dole |
| `src/components/deals-team/OfferingTab.tsx` | Wykres timeline platnosci (AreaChart) |
| `src/components/deals-team/ClientsSummaryView.tsx` | BarChart prognozy + PieChart kategorii |
| `src/components/deals-team/FunnelConversionChart.tsx` | NOWY -- wykres lejka konwersji |
| `src/components/deals-team/index.ts` | Export FunnelConversionChart |

### Biblioteka

Recharts jest juz zainstalowany. ChartContainer, ChartTooltip, ChartTooltipContent sa juz dostepne w `src/components/ui/chart.tsx`.

### Dane -- skad bierzemy

- **Lejek konwersji**: z `useTeamContactStats` (hot_count, top_count itd.) + dodanie offering_count
- **Timeline platnosci**: z `useTeamPaymentSchedule` (juz istnieje)
- **Prognoza miesieczna**: z `useAllTeamForecasts` (juz istnieje)
- **Kategorie produktow**: z `useAllTeamClientProducts` (juz istnieje)

Nie wymaga zmian w bazie danych.

