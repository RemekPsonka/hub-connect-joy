
# Aktywne karty KPI + zwijane menu w sidebarze

## 1. Klikalne karty KPI na dashboardzie

Karty KPI (HOT Leads, TOP Leads, Leads, 10x, Cold, Przegrane, Klienci, Ofertowanie, Poszukiwani) beda klikalane i beda przelaczac uzytkownika do odpowiedniego widoku/tabu w module Lejek sprzedazy.

Mapowanie kart na widoki:
- HOT Leads -> `kanban` (Kanban z filtrem hot)
- TOP Leads -> `kanban` (Kanban z filtrem top)  
- Leads -> `kanban` (Kanban z filtrem lead)
- 10x -> `kanban` (Kanban z filtrem 10x)
- Cold -> `kanban` (Kanban z filtrem cold)
- Przegrane -> `kanban` (Kanban z filtrem lost)
- Klienci -> `clients`
- Ofertowanie -> `offering`
- Poszukiwani -> `prospecting`

Komponent `SalesFunnelDashboard` otrzyma nowy prop `onNavigate(viewMode: string)` przekazywany z `DealsTeamDashboard`. `KPICard` otrzyma opcjonalny prop `onClick` i bedzie renderowany jako klikalny element z efektem hover (`cursor-pointer`, `hover:shadow-md`).

## 2. Zwijane grupy kategorii w sidebarze

Kazda grupa nawigacyjna (Overview, CRM, Projekty, Sprzedaz, AI, System) bedzie zwijana z uzyciem komponentu `Collapsible` z Radix UI. Klikniecie na nazwe grupy bedzie zwiac/rozwiac liste linkow.

- Grupy beda domyslnie rozwiniete
- Ikona strzalki (ChevronDown) bedzie obracana przy zwinietej grupie
- Grupa zawierajaca aktywna strone bedzie automatycznie rozwinieta
- W trybie zwiniecia sidebara (icon mode) grupy beda ukryte

## Szczegoly techniczne

### Plik: `src/components/deals-team/SalesFunnelDashboard.tsx`

- Dodanie propa `onNavigate: (view: string) => void` do interfejsu
- Dodanie propa `onClick` do `KPICard`
- Przekazanie odpowiedniego `onClick` do kazdej karty KPI
- Dodanie stylow hover (`cursor-pointer`, `hover:shadow-md`, `transition-shadow`)

### Plik: `src/pages/DealsTeamDashboard.tsx`

- Przekazanie `onNavigate={setViewMode}` do `SalesFunnelDashboard`

### Plik: `src/components/layout/AppSidebar.tsx`

- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` z `@radix-ui/react-collapsible`
- Import `ChevronDown` z `lucide-react`
- Dodanie stanu `openGroups` (Record string boolean) do sledzenia ktore grupy sa rozwiniete
- Zamiana kazdego `SidebarGroup` na `Collapsible` z `GroupLabel` jako triggerem
- `SidebarGroupContent` owiniety w `CollapsibleContent`
- Grupy z aktywna strona beda domyslnie otwarte
- Ikona strzalki obok nazwy grupy z animacja obrotu

### Zmieniane pliki

| Plik | Zmiana |
|------|--------|
| `src/components/deals-team/SalesFunnelDashboard.tsx` | Dodanie `onNavigate` prop, klikalne KPI karty |
| `src/pages/DealsTeamDashboard.tsx` | Przekazanie `onNavigate` do dashboardu |
| `src/components/layout/AppSidebar.tsx` | Zwijane grupy z Collapsible |
