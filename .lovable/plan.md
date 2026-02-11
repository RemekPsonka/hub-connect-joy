
# Zakladka KLIENCI w module Zespol Deals + Grupy produktow i Prognoza dealow

## Podsumowanie

Rozbudowa modulu "Zespol Deals" o nowa zakladke **KLIENCI** (obok Kanban, Tabela, Prospecting). Klienci to kontakty ze statusem `won` (wygrany deal) lub dodane recznie z CRM. Kazdy klient musi istniec w tabeli `contacts`. W zakladce Klienci mozna:

- Przypisac grupy produktow (np. Flota, Zycie, Majatkowe) z kwotami deali i oczekiwanymi prowizjami
- Dodac prognoze deala z rozkladem miesiecznym (12 miesiecy, suwaki procentowe)
- Przegladac podsumowania per kategoria, per klient, w widoku miesiecznym

Na Kanbanie (leady) rowniez mozna przypisac grupy produktow z oczekiwanymi kwotami -- raportowane w kafelkach z podsumowaniem. Kazda kategoria Kanbana ma przypisany % szans (np. HOT=80%, TOP=50%, LEAD=20%, COLD=5%).

## Nowe tabele

### 1. `deal_team_product_categories` -- grupy produktow per zespol

```text
id UUID PK
team_id UUID FK -> deal_teams
tenant_id UUID
name TEXT (np. "Flota", "Zycie", "Majatkowe")
color TEXT (kolor badge)
probability_percent INT (domyslny % szans dla tej grupy)
sort_order INT
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
```

### 2. `deal_team_client_products` -- przypisanie produktow do klienta/leada

```text
id UUID PK
team_id UUID FK -> deal_teams
team_contact_id UUID FK -> deal_team_contacts
product_category_id UUID FK -> deal_team_product_categories
tenant_id UUID
deal_value NUMERIC (laczna szacowana kwota deala)
expected_commission NUMERIC (oczekiwana prowizja)
commission_percent NUMERIC (% prowizji -- opcjonalnie auto-obliczane)
probability_percent INT (% szans -- domyslnie z kategorii kanban lub z product_category)
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 3. `deal_team_revenue_forecasts` -- prognoza miesieczna deala

```text
id UUID PK
client_product_id UUID FK -> deal_team_client_products
tenant_id UUID
month_offset INT (0-11, gdzie 0 = biezacy miesiac)
month_date DATE (pierwszy dzien miesiaca -- obliczany przy tworzeniu)
amount NUMERIC (kwota prognozowana na dany miesiac)
percentage NUMERIC (% z lacznej kwoty -- wyswietlany na suwaku)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### 4. `deal_team_clients` -- status klienta w zespole (rozszerzenie deal_team_contacts)

Zamiast osobnej tabeli -- wykorzystamy istniejaca `deal_team_contacts` z nowa kategoria `'client'`. To najprostsza droga:
- Dodajemy wartosc `'client'` do kategorii (obok hot/top/lead/cold)
- Kontakt ze statusem `won` moze byc "skonwertowany" do klienta
- Klienci maja inne kolory (zielone) i nie pojawiaja sie na Kanbanie

## Zmiany w istniejacych tabelach

### `deal_team_contacts`
- Nowa wartosc category: `'client'` (dodana przez kod, nie constraint -- tabela uzywa TEXT)
- Pole `estimated_value` bedzie teraz suma z `deal_team_client_products` (obliczana po stronie klienta lub triggerem)

## Logika % szans per kategoria Kanban

Stale w kodzie (konfigurowalne w TeamSettings):

```text
HOT  = 80% szans
TOP  = 50% szans  
LEAD = 20% szans
COLD = 5% szans
```

Kafelki TeamStats pokaza: `Wartosc wazona = SUM(deal_value * probability%)` per kategoria.

## Nowe / modyfikowane pliki

### Nowe pliki

| Plik | Opis |
|---|---|
| `src/components/deals-team/ClientsTab.tsx` | Glowna zakladka KLIENCI -- lista klientow z grupami produktow, sumami, prognozami |
| `src/components/deals-team/ClientCard.tsx` | Karta klienta -- zielona kolorystyka, grupy produktow z kwotami |
| `src/components/deals-team/AddClientDialog.tsx` | Dialog dodania klienta z CRM (reuse logiki z AddContactDialog) |
| `src/components/deals-team/ClientProductsPanel.tsx` | Panel zarzadzania grupami produktow klienta -- dodawanie/edycja deal_value, prowizji |
| `src/components/deals-team/RevenueForecastDialog.tsx` | Dialog z 12 suwakami miesiecznymi -- rozklad przychodu w czasie |
| `src/components/deals-team/ProductCategoryManager.tsx` | Zarzadzanie kategoriami produktow w TeamSettings |
| `src/components/deals-team/ClientsSummaryView.tsx` | Widok podsumowujacy: per kategoria produktu, per klient, widok miesieczny |
| `src/components/deals-team/LeadProductsSection.tsx` | Sekcja w DealContactDetailSheet -- przypisanie produktow do leada |
| `src/hooks/useTeamClients.ts` | Hook: CRUD klientow, produktow, prognoz |
| `src/hooks/useProductCategories.ts` | Hook: CRUD kategorii produktow zespolu |

### Modyfikowane pliki

| Plik | Zmiana |
|---|---|
| `src/pages/DealsTeamDashboard.tsx` | Dodanie zakladki "Klienci" (ikona UserCheck, zielona) + ViewMode `'clients'` |
| `src/components/deals-team/index.ts` | Export nowych komponentow |
| `src/components/deals-team/TeamStats.tsx` | Nowy kafelek "Klienci" (zielony) + wartosc wazona per kategoria Kanban |
| `src/components/deals-team/TeamSettings.tsx` | Sekcja "Grupy produktow" -- ProductCategoryManager |
| `src/components/deals-team/DealContactDetailSheet.tsx` | Sekcja "Produkty" (LeadProductsSection) + przycisk "Konwertuj do klienta" |
| `src/types/dealTeam.ts` | Nowe typy: `DealCategory` rozszerzony o `'client'`, nowe interfejsy |
| `src/components/deals-team/KanbanBoard.tsx` | Filtrowanie -- nie pokazuj category='client' na Kanbanie |
| Migracja SQL | 3 nowe tabele + RLS + indeksy |

## Workflow uzytkowania

```text
KONFIGURACJA:
1. W TeamSettings -> "Grupy produktow" -> dodaj: Flota, Zycie, Majatkowe
2. Kazda grupa ma domyslny kolor i opcjonalny % prowizji

PRACA Z LEADAMI (Kanban):
3. Na karcie leada (DealContactDetailSheet) -> sekcja "Produkty"
4. Dodaj grupe produktowa: Flota - 500k PLN, prowizja 15k
5. Kafelki TeamStats pokazuja wartosc wazona: 500k * 20% (LEAD) = 100k

KONWERSJA DO KLIENTA:
6. Lead ze statusem "won" -> przycisk "Konwertuj do klienta"
7. Kontakt przenosi sie z Kanban do zakladki KLIENCI (category = 'client')
8. Produkty i kwoty pozostaja -- szanse zmienaja sie na 100%

PROGNOZA:
9. Na karcie klienta -> "Dodaj prognoze" -> 12 suwakow miesiecznych
10. Np. Flota 1M PLN: sty=0%, lut=0%, mar=10%, kwi=20%, maj=30%, cze=40%
11. Suwaki sumuja sie do 100%

RAPORTY:
12. Widok "Podsumowanie" w zakladce KLIENCI:
    - Per kategoria: Flota=2.5M, Zycie=800k, Majatkowe=1.2M
    - Per klient: Firma A=1M, Firma B=500k
    - Widok miesieczny: sty=200k, lut=350k, mar=500k...
```

## UI zakladki KLIENCI

```text
+--------------------------------------------------+
| [Dodaj klienta z CRM] [Podsumowanie]             |
+--------------------------------------------------+
| Szukaj klienta...                                 |
+--------------------------------------------------+
| Firma ABC                                    ✅   |
| Jan Kowalski · Dyrektor                           |
| [Flota: 500k PLN | Prowizja: 15k]                |
| [Zycie: 200k PLN | Prowizja: 8k]                 |
| Prognoza: mar 50k, kwi 100k, maj 150k...         |
+--------------------------------------------------+
| Firma XYZ                                    ✅   |
| Anna Nowak · Prezes                               |
| [Majatkowe: 1M PLN | Prowizja: 45k]              |
| Prognoza: lut 200k, mar 300k, kwi 500k...        |
+--------------------------------------------------+
| PODSUMOWANIE                                      |
| Flota:      2.5M PLN  | Prowizja: 85k            |
| Zycie:      800k PLN  | Prowizja: 32k            |
| Majatkowe:  1.2M PLN  | Prowizja: 54k            |
| RAZEM:      4.5M PLN  | Prowizja: 171k           |
+--------------------------------------------------+
```

## Dialog prognozy (suwaki)

```text
+-- Prognoza: Flota - 1,000,000 PLN ----------------+
|                                                     |
| Luty 2026    [====-------] 10%    100,000 PLN      |
| Marzec 2026  [========---] 20%    200,000 PLN      |
| Kwiecień     [==========] 30%     300,000 PLN      |
| Maj          [============] 40%   400,000 PLN      |
| Czerwiec     [--] 0%              0 PLN             |
| ...                                                 |
| Suma: 100% = 1,000,000 PLN                         |
|                                        [Zapisz]    |
+-----------------------------------------------------+
```

## Kolorystyka

- **Klienci**: zielony (`emerald-500`) -- sukces, wygrany deal
- **HOT**: czerwony (bez zmian)
- **TOP**: bursztynowy (bez zmian)
- **LEAD**: niebieski (bez zmian)
- **COLD**: szary (bez zmian)

Kafelek "Klienci" w TeamStats: zielona ramka, ikona UserCheck, liczba klientow + laczna wartosc.
