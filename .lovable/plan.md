

## Plan: SGU-REFACTOR-IA-2 — Finish (z poprawkami)

### Poprawka 1 — StageBadge API w ClientPortfolioTab

Faktyczny interface `StageBadge` (potwierdzone w `src/components/sgu/sales/StageBadge.tsx`):
```ts
{ stage: DealStage; value: SubValue; mode?: 'compact'|'full'; onChange: (v: string) => void; onWonClick?; onLostClick? }
```

Użycie w `ClientPortfolioTab`:
```tsx
<StageBadge
  stage="client"
  value={r.client_status ?? 'standard'}
  onChange={(v) => updateContact.mutate({ id: r.id, teamId, clientStatus: v })}
/>
```

**Sprawdzenie `useUpdateTeamContact`** — jeśli brak pól `clientStatus` / `isLost` / `lostReason` / `lostAt`, dorzucam do mutacji (mapping na kolumny snake_case `client_status`, `is_lost`, `lost_reason`, `lost_at`). Update typu argumentu mutacji.

`teamId` dostępny z propa `ClientPortfolioTab` — dodam jeśli brakuje (obecnie tab dostaje tylko `rows`/`isLoading`).

### Poprawka 2 — Layout ClientsHeader

Wybieram opcję A: `grid-cols-2 md:grid-cols-4 lg:grid-cols-7` (jeden rząd na lg, 4 na md, 2 na mobile). Zwięzłe, bez wizualnego podziału na sekcje.

### Krok 1 — Wpięcia z poprzedniej iteracji

- `OfferingTab.tsx` — usuń sekcję Timeline 24mc + osierocone importy (`recharts`, `chartConfig`, `addMonths`, `startOfMonth`, `format` jeśli nieużywane gdzie indziej).
- `ClientPaymentsTab.tsx` — render Timeline 24mc (`ChartContainer` z `BarChart`: `bookedPerMonth` vs `paidPerMonth` 24 mies. wstecz). Reuse logiki z OfferingTab.
- `SGUPipelineRoute.tsx` → `<SalesHeader/>` na górze.
- `SGUTasks.tsx` → `<TasksHeader/>` na górze.
- `SGUDashboard.tsx` → `<DashboardHeader/>` na górze (zachować istniejące widgety pod headerem).
- `SGUCommissionsAdmin.tsx` → `<CommissionsHeader/>` na górze.

### Krok 2 — ClientsHeader (rename + 2 metryki)

**Hook** `useSGUClientsPortfolio.ts`:
- `SGUClientRow`: + `client_status: string | null`, `potential_property_gr: number`, `potential_financial_gr: number`, `potential_communication_gr: number`, `potential_life_group_gr: number`.
- Select: dorzucić te 5 kolumn.
- `totals`: + `ambassadorsCount` (count `client_status==='ambassador'`), `complexClientsCount` (count gdzie `(potential_property_gr>0)+(potential_financial_gr>0)+(potential_communication_gr>0)+(potential_life_group_gr>0) >= 3`). Wyliczenie po stronie hooka (JS), nie SQL — zgodnie z uwagą.

**Nowy plik** `src/components/sgu/headers/ClientsHeader.tsx` — kopia z `ClientsKPI.tsx`:
- Layout `grid-cols-2 md:grid-cols-4 lg:grid-cols-7`.
- 5 starych kart + 2 nowe: "Ambasadorzy" (Trophy, `ambassadorsCount`), "Kompleksowi" (Layers, `complexClientsCount`, sub: "≥3 obszary aktywne").

**Edycja** `SGUClientsView.tsx` — `<ClientsKPI>` → `<ClientsHeader>`, podmień import.

**Cleanup:** usuń `src/components/sgu/clients/ClientsKPI.tsx`. Grep `ClientsKPI` w `src/` po zmianie → 0.

### Krok 3 — TeamStats cleanup

- `DealsTeamDashboard.tsx` linia 175 — usuń `<TeamStats>` + import linia 12.
- `src/components/deals-team/index.ts` linia 16 — usuń export.
- Usuń plik `src/components/deals-team/TeamStats.tsx`.
- `FunnelConversionChart` — zostawiam (zero-risk, niepotwierdzony orphan).

### Krok 4 — ClientPortfolioTab: Status badge + 6 mini-ikon

**Edycja** `ClientPortfolioTab.tsx`:
- Prop: dodać `teamId: string` (przekazać z `SGUClientsView`).
- Import `StageBadge` z `@/components/sgu/sales/StageBadge`, `useClientComplexity` z `@/hooks/useClientComplexity`, `useUpdateTeamContact` z `@/hooks/useUpdateTeamContact`.
- Header: dodać `<TableHead>Status</TableHead>` (po "Klient") + `<TableHead>Obszary</TableHead>` (po "Polisy").
- Wiersz:
  - Status: `<StageBadge stage="client" value={r.client_status ?? 'standard'} onChange={(v) => updateContact.mutate({ id: r.id, teamId, clientStatus: v })} />`
  - Obszary: 6 emoji (🏠💰📞🏥🎯📢) z `opacity-100`/`opacity-30` zależnie od `complexity.areas[i].active`. Każda ikona w `<Tooltip>` z labelem PL.
- `useClientComplexity(rows)` raz na górze, `complexityMap.get(r.id)` per wiersz.

**Edycja** `useUpdateTeamContact.ts` (jeśli brak pól):
- Argumenty mutacji: + `clientStatus?: string`, `isLost?: boolean`, `lostReason?: string`, `lostAt?: string`.
- Update body: mapowanie na kolumny snake_case, `lost_at` jako `now()` jeśli `isLost=true` a `lostAt` puste.

### Krok 5 — Raport końcowy

W czacie po implementacji:
1. Lista plików: nowe / edytowane / usunięte.
2. Output `npm run typecheck` (lub `tsc --noEmit`).
3. Potwierdzenie: `grep -r "ClientsKPI" src/` → 0 matchów.
4. Potwierdzenie: `grep -r "TeamStats" src/` → 0 matchów.
5. 4 recon confirmations (z poprzedniego raportu).

### Pliki — podsumowanie

**Nowe (1):** `src/components/sgu/headers/ClientsHeader.tsx`

**Edycja (10):**
- `src/hooks/useSGUClientsPortfolio.ts` (5 pól + 2 totals)
- `src/hooks/useUpdateTeamContact.ts` (clientStatus/isLost/lostReason/lostAt — jeśli brak)
- `src/components/sgu/SGUClientsView.tsx` (ClientsKPI→ClientsHeader, przekaż teamId do PortfolioTab)
- `src/components/sgu/clients/ClientPortfolioTab.tsx` (Status + 6 ikon, prop teamId)
- `src/components/sgu/clients/ClientPaymentsTab.tsx` (Timeline render)
- `src/components/deals-team/OfferingTab.tsx` (usuń Timeline)
- `src/components/deals-team/index.ts` (usuń TeamStats export)
- `src/pages/DealsTeamDashboard.tsx` (usuń `<TeamStats>` + import)
- `src/pages/sgu/SGUPipelineRoute.tsx` + `SGUTasks.tsx` + `SGUDashboard.tsx` + `SGUCommissionsAdmin.tsx` (wpięcia headerów — 4 strony)

**Usunięte (2):** `src/components/sgu/clients/ClientsKPI.tsx`, `src/components/deals-team/TeamStats.tsx`

### Acceptance
- [ ] `npm run typecheck` → 0 błędów (output w raporcie).
- [ ] `grep ClientsKPI src/` → 0. `grep TeamStats src/` → 0.
- [ ] OfferingTab bez Timeline. ClientPaymentsTab z Timeline 24mc.
- [ ] 4 SGU routes mają context-aware headery.
- [ ] ClientsHeader (7 kart) w SGUClientsView, layout `grid-cols-2 md:grid-cols-4 lg:grid-cols-7`.
- [ ] ClientPortfolioTab: kolumna Status (StageBadge interaktywny) + kolumna Obszary (6 emoji z opacity).

