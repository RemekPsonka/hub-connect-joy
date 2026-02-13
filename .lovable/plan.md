
# Dashboard Lejka Sprzedazy -- nowa zakladka "Dashboard"

## Cel

Stworzyc kompleksowy dashboard analityczny w module "Lejek sprzedazy" (/deals-team) jako nowa zakladka "Dashboard". Dashboard laczy dane z lejka, ofertowania i prowizji klientow w jednym widoku z mozliwoscia analizy w ujeciu miesiac/kwartal/rok.

## Struktura dashboardu

Dashboard sklada sie z 5 sekcji:

### Sekcja 1: Selektor okresu + KPI karty lejka
- Selektor: rok/kwartal/miesiac z nawigacja strzalkami (wzorzec z ProductionDashboard)
- Karty KPI (jak na zdjeciu): HOT Leads, TOP Leads, Leads, Cold Leads, Klienci, Ofertowanie, Poszukiwani -- kazda z liczba, wartoscia i prowizja
- Pasek "Pipeline wazony" (wszystkie produkty x % szans)

### Sekcja 2: Lejek konwersji + 3 zrodla prognoz
Dwie kolumny:
- Lewa: wykres lejka konwersji (COLD -> LEAD -> TOP -> HOT -> OFERTOWANIE -> KLIENT) -- pelny, nie tylko 4 etapy
- Prawa: 3 karty prognoz:
  1. **Prognoza z lejka** -- pipeline wazony (produkty x % szans wg kategorii)
  2. **Prognoza z ofertowania** -- zaplanowane platnosci z harmonogramu (dokladniejsze szacunki)
  3. **Prognoza z prowizji klientow** -- revenue forecasts istniejacych klientow

### Sekcja 3: KPI prowizji (z CommissionsTab)
- 4 karty: Prognoza prowizji, Otrzymana prowizja, Roznica, % realizacji
- Filtrowane wg wybranego okresu (rok/kwartal/miesiac)

### Sekcja 4: KPI ofertowania (z OfferingTab)
- 4 karty: W ofertowaniu, Zaplanowane, Oplacone, Nadchodzace

### Sekcja 5: Timeline 24 miesiace
- Wykres area chart z 3 liniami: prognoza z lejka, prognoza z ofertowania, prognoza z prowizji klientow
- Horyzont 24 miesiecy do przodu

## Szczegoly techniczne

### Nowy plik: `src/components/deals-team/SalesFunnelDashboard.tsx`

Glowny komponent dashboardu. Korzysta z istniejacych hookow:
- `useTeamContactStats` -- statystyki kategorii
- `useTeamContacts` -- wszystkie kontakty
- `useAllTeamClientProducts` + `CATEGORY_PROBABILITY` -- pipeline wazony
- `useAllTeamForecasts` -- prognozy przychodow klientow
- `useTeamPaymentSchedule` -- harmonogram platnosci (ofertowanie)
- `useActualCommissions` -- realne prowizje
- `useTeamClients` -- lista klientow
- `useTeamProspects` -- prospecting stats

Komponent zawiera selektor okresu (rok/kwartal/miesiac) i filtruje dane wg wybranego zakresu dat.

Trzy zrodla prognoz obliczane sa jako:
1. **Lejek**: suma(deal_value x CATEGORY_PROBABILITY[category]) dla wszystkich produktow w lejku
2. **Ofertowanie**: suma platnosci z `deal_team_payment_schedule` w danym okresie
3. **Prowizje klientow**: suma z `deal_team_revenue_forecasts` w danym okresie

### Zmiana: `src/pages/DealsTeamDashboard.tsx`

- Dodanie `'dashboard'` do typu `ViewMode`
- Nowa zakladka "Dashboard" z ikona BarChart3 (przed Kanban)
- Renderowanie `<SalesFunnelDashboard teamId={selectedTeamId} />` gdy viewMode === 'dashboard'

### Zmiana: `src/components/deals-team/index.ts`

- Export nowego komponentu `SalesFunnelDashboard`

### Zmiana: `src/components/deals-team/FunnelConversionChart.tsx`

- Przywrocenie pelnego lejka (wszystkie 8 etapow: COLD -> LEAD -> 10x -> TOP -> HOT -> OFERTOWANIE -> KLIENT) do uzycia na dashboardzie
- Dodanie opcjonalnego propa `compact` -- gdy true, pokazuje tylko 4 kluczowe etapy (dla TeamStats)

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/SalesFunnelDashboard.tsx` | NOWY -- glowny komponent dashboardu |
| `src/pages/DealsTeamDashboard.tsx` | Nowa zakladka "Dashboard" |
| `src/components/deals-team/index.ts` | Export SalesFunnelDashboard |
| `src/components/deals-team/FunnelConversionChart.tsx` | Prop `compact` dla 2 trybow wyswietlania |

Brak zmian w bazie danych -- wszystkie potrzebne dane sa juz dostepne.
