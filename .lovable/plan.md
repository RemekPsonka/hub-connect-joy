

## Plan: KROK 7 część 1 — Dashboard "Co dziś" (priorytety + szkielet)

### Recon (co już istnieje wg kontekstu + memory)
- ✅ `SGUDashboard.tsx` — ma `<DashboardHeader/>`, KPICards, `TeamPerformanceTable` (partner-only), `AlertsPanel`. Brakuje: nowego gridu Priorytety+Alerts, FunnelConversionChart, StickyQuickActions, EmptyStateCTA.
- ✅ `DashboardHeader` (IA-2) — zachowuje
- ✅ `FunnelConversionChart` — istnieje w `src/components/deals-team/` → reuse
- ✅ `useSGUAccess` → `isPartner` (rola partner/director check)
- ❓ `useCrossSellCandidates` — w IA-2 świadomie skipnięte ("nie istnieje, do IA-3"). Sprawdzę grep, jeśli brak → zbuduję inline w hooku P5.

### Pliki do utworzenia (10)

**Hooki w `src/hooks/sgu-dashboard/`:**
1. `usePriorityTaskToday.ts` — query `tasks` (priority=high, due_date=today)
2. `usePriorityStuckNegotiation.ts` — `deal_team_contacts` (offering/negotiation, updated_at < now-3d)
3. `usePriorityOverduePayment.ts` — `deal_team_payment_schedule` (status=overdue)
4. `usePriorityColdTopLead.ts` — `deal_team_contacts` (temperature=top, stale 7d)
5. `usePriorityCrossSell.ts` — `deal_team_contacts` (client + potential_*_gr=0 dla ≥1 obszaru, client_status=standard)
6. `useDashboardEmptyState.ts` — `count(*)` z `deal_team_contacts` (clients + contacts) → boolean `isEmpty`

**Komponenty w `src/components/sgu/dashboard/`:**
7. `PriorityTodayCard.tsx` — Card z 5 wierszami P1–P5 + ikony + navigate
8. `AlertsCard.tsx` — wrapper Card wokół istniejącego `AlertsPanel`
9. `TeamPerformanceCard.tsx` — wrapper Card wokół istniejącego `TeamPerformanceTable` + `useSGUTeamPerformance` (partner-only)
10. `StickyQuickActions.tsx` — bottom sticky bar (np. Dodaj kontakt / Nowe zadanie / Nowa polisa)
11. `EmptyStateCTA.tsx` — 3 CTA tiles (Dodaj klienta / Import CSV / AI KRS)

**Typy:**
12. `src/types/sgu-dashboard.ts` — `DashboardPriorityItem` (kind/id/title/meta/navigateTo + opcjonalnie icon key)

### Pliki do edycji (1)
- `src/pages/sgu/SGUDashboard.tsx` — przebudowa layoutu:
  - Header (zostaje DashboardHeader)
  - Empty state guard (jeśli `isEmpty` → render `<EmptyStateCTA/>`, skip reszty)
  - Grid 2-col: `PriorityTodayCard` + `AlertsCard`
  - `TeamPerformanceCard` (gdy `isPartner`)
  - `FunnelConversionChart` (reuse) — query stats z `useDealsTeamStats` lub equivalent (sprawdzę co istnieje; jeśli brak prostego hooka → inline RPC/select counts po stage)
  - `StickyQuickActions` (fixed bottom)
  - Usunięcie obecnych KPICards (są zduplikowane z DashboardHeader) — TBD: jeśli DashboardHeader już je pokazuje, usuwamy stare; jeśli inne metryki, zostawiamy. **Decyzja:** porównam i usunę duplikat (DashboardHeader z IA-2 ma już 4 karty: Nowe polisy / Booked / Collected / Prowizja).

### Pattern hooka priorytetowego
```ts
export function usePriorityTaskToday() {
  return useQuery({
    queryKey: ['sgu-priority-task-today'],
    queryFn: async (): Promise<DashboardPriorityItem | null> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .eq('priority', 'high')
        .gte('due_date', startOfToday)
        .lt('due_date', startOfTomorrow)
        .order('due_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        kind: 'task',
        id: data.id,
        title: data.title,
        meta: `Termin: ${formatTime(data.due_date)}`,
        navigateTo: '/sgu/zadania?filter=today&priority=high',
      };
    },
    staleTime: 60_000,
  });
}
```

### Decyzje implementacyjne
- **Empty state detection:** lekki `count` HEAD request (`{ count: 'exact', head: true }`) na `deal_team_contacts` filtrowane po user/team — bez ciągnięcia danych.
- **FunnelConversionChart props:** wymaga `stats`. Sprawdzę czy jest `useDealsTeamStats` / `useFunnelStats`. Jeśli tak → reuse. Jeśli nie → minimalny inline hook `useFunnelStats` (5 counts po stage) w tym samym kroku.
- **StickyQuickActions:** `fixed bottom-0 left-0 right-0 border-t bg-background` z 3-4 buttonami (navigate). Mobile-friendly.
- **EmptyStateCTA:** 3 duże tiles z ikonami i opisami. CTA #3 "AI KRS" → `/sgu/admin/team` lub dialog (placeholder navigate).
- **Brak modyfikacji** `useTasks`, `useDealsTeamContacts` — zgodnie z constraint.
- **Brak `useCrossSellCandidates`:** zbuduję go ad-hoc w `usePriorityCrossSell` (single-record query) bez tworzenia osobnego hooka shared (ten zostawiam na IA-3 część dalsza).

### Kolejność wykonania
1. Czytam aktualny `SGUDashboard.tsx`, `FunnelConversionChart.tsx`, sprawdzam istnienie `useFunnelStats` / `useCrossSellCandidates` / `AlertsPanel` props.
2. Tworzę typy + 6 hooków równolegle.
3. Tworzę 5 komponentów (PriorityTodayCard najbardziej złożony — łączy 5 hooków).
4. Przepisuję `SGUDashboard.tsx`.
5. Typecheck (`npx tsc --noEmit`).
6. Raport: lista plików + status DoD.

### Skipy świadome
- **`useCrossSellCandidates` shared hook** — nie tworzę osobnego, tylko `usePriorityCrossSell` (zwraca 1 rekord). Jeśli IA-3 dalej go potrzebuje gdziekolwiek indziej, wydzielę wtedy.
- **`StickyQuickActions` actions** — na razie 3 buttony z navigate (Dodaj kontakt → `/contacts/new` lub equivalent, Nowe zadanie → `/sgu/zadania`, Nowa polisa → `/sgu/admin/products`). Bez dialogów modalnych (te w IA-3 dalej).

