

# Przeniesienie nawigacji widoków z górnego menu do sidebara

## Zmiany

### 1. `src/components/layout/AppSidebar.tsx`

- Usunac `{ title: 'Zadania sprzedaży', url: '/deals-team?view=tasks', ... }` z `salesItems`
- Zamienic `{ title: 'Lejek sprzedaży', url: '/deals-team', icon: TrendingUp }` na element rozwijalny z podlinkamiz:
  - Dashboard → `/deals-team?view=dashboard`
  - Kanban → `/deals-team?view=kanban`
  - Tabela → `/deals-team?view=table`
  - Prospecting → `/deals-team?view=prospecting`
  - Klienci → `/deals-team?view=clients`
  - Ofertowanie → `/deals-team?view=offering`
  - Zadania → `/deals-team?view=tasks`
  - Prowizje → `/deals-team?view=commissions`
  - Odlożone → `/deals-team?view=snoozed`
- Uzyc `Collapsible` (juz zaimportowane) do rozwijania podlinków pod "Lejek sprzedazy"
- Automatycznie rozwijac gdy uzytkownik jest na `/deals-team`

### 2. `src/pages/DealsTeamDashboard.tsx`

- Usunac caly blok `<Tabs>` z gornego menu (linie 147-188)
- Odczytywac `view` z `searchParams` reaktywnie (nie tylko na init) i ustawiac `viewMode` przy kazdej zmianie URL
- Domyslny widok gdy brak `?view=` to `kanban`

