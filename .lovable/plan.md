

# Poprawka szerokosci dashboardu

## Problem

9 kart KPI w jednym rzedzie (`lg:grid-cols-9`) nie miesci sie na ekranie -- karty sa za waskie i tekst sie ucina. Tabs z zakladkami rowniez wychodzi poza ekran.

## Rozwiazanie

### 1. Karty KPI -- zmiana layoutu z 9 kolumn na 2 rzedy

Zamiast jednego rzedu 9 kart, uklad bedzie:
- **Gorny rzad**: 5 kart (HOT, TOP, Leads, 10x, Cold) -- `lg:grid-cols-5`
- **Dolny rzad**: 4 karty (Przegrane, Klienci, Ofertowanie, Poszukiwani) -- `lg:grid-cols-4`

Alternatywnie: jeden grid `lg:grid-cols-5` ktory lamiie karty na 2 rzedy (5+4).

### 2. Zakladki nawigacyjne -- scroll lub zawijanie

Pasek zakladek (Dashboard, Kanban, Tabela, Klienci...) wymaga `overflow-x-auto` zeby mozna bylo przewijac gdy nie miesci sie na ekranie. Lub zmniejszyc padding/rozmiar tekstu.

## Szczegoly techniczne

### Plik: `src/components/deals-team/SalesFunnelDashboard.tsx`

- Zmiana grida KPI z `grid-cols-2 lg:grid-cols-9` na `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` -- karty ulozone w 2 rzedach (5+4)
- Zmniejszenie minimalnej szerokosci kart

### Plik: `src/pages/DealsTeamDashboard.tsx`

- Dodanie `overflow-x-auto` do kontenera z zakladkami nawigacyjnymi aby mozna bylo je przewijac na wezszych ekranach
- Ewentualne zmniejszenie paddingu/rozmiaru tekstu w zakadkach

