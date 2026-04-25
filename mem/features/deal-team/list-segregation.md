---
name: deal-team list segregation
description: Reguły kogo pokazują 3 listy (Odprawa/Kanban/Klienci) — AUDIT-FIX-01 2026-04-25
type: feature
---
3 listy nad tym samym `deal_team_contacts` mają osobne reguły:

- **Odprawa** (`/sgu/odprawa`, RPC `get_odprawa_agenda`) — `category <> 'client' AND is_lost=false`. Lejek sprzedaży, klienci wykluczeni.
- **Kanban** (`/sgu/sprzedaz`, hook `useTeamContacts`) — `category <> 'client' AND status NOT IN (won,lost,disqualified)`. Lejek sprzedaży, klienci wykluczeni. Gdy hook wywołany z konkretnym `category` argumentem (np. `'lead'`) — filtr per kategoria, klauzula `<> client` pomijana.
- **Klienci** (`/sgu/klienci`, hook `useSGUClientsPortfolio`) — `category='client'`. Wszyscy klienci bez wyjątku.

Stan klienta: jednolity `status='won'` (po AUDIT-FIX-01 zunifikowano 15 historycznych `active` do `won`).

Synchronizacja składek z aktywacją obszarów:
- `WonPremiumBreakdownDialog` (K4 w Odprawie) zapisuje `potential_*_gr` ORAZ `client_complexity.*_active = (potential>0)`.
- Hook `useUpdateTeamContact` przy `clientComplexity` robi MERGE z istniejącym JSON (zachowuje `referrals_count`, `references_count`).
- W `useClientComplexity.getClientComplexity` aktywność obszaru = `client_complexity.*_active=true` LUB polisa danego typu.

UWAGA: `ConvertToClientDialog` (Kanban) używa OSOBNEGO modelu (`deal_team_client_products` + `useAddClientProduct`) — nie dotyka `potential_*_gr` ani `client_complexity`. Jeśli kiedyś trzeba zunifikować — to osobny sprint.

Helper: `src/lib/dealTeam/categorySemantics.ts` — `SALES_CATEGORIES`, `CLIENT_CATEGORIES`, `TERMINAL_CATEGORIES` + helpery.
