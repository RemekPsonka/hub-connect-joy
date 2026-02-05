

# Plan: Hook useDashboardStats z React Query

## Cel

Wyodrębnienie logiki pobierania statystyk dashboardu do dedykowanego hooka z React Query, co umożliwi automatyczne odświeżanie, cache'owanie i invalidację po mutacjach.

---

## Obecny stan

### Już zaimplementowane
| Element | Status |
|---------|--------|
| `mv_dashboard_stats` (Materialized View) | Działa |
| `get_dashboard_stats()` RPC | Działa |
| Triggery automatycznego refresha MV | Aktywne na 5 tabelach |

### Do zmiany
| Element | Problem |
|---------|---------|
| `Dashboard.tsx` | Używa `useEffect` + `useState` zamiast React Query |
| Brak `useDashboardStats` | Hook nie istnieje |
| Brak invalidacji cache | Mutacje nie odświeżają statystyk dashboardu |

---

## Składniki implementacji

### Krok 1: Nowy hook `src/hooks/useDashboardStats.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  total_contacts: number;
  new_contacts_30d: number;
  contacts_prev_30d: number;
  today_consultations: number;
  pending_tasks: number;
  active_needs: number;
  active_offers: number;
  pending_matches: number;
  upcoming_meetings: number;
  healthy_contacts: number;
  warning_contacts: number;
  critical_contacts: number;
  refreshed_at: string;
}

export function useDashboardStats() {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: async (): Promise<DashboardStats | null> => {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 min (MV refreshuje się triggerami)
    refetchOnWindowFocus: true,
  });
}
```

### Krok 2: Aktualizacja `Dashboard.tsx`

**Przed (useEffect + useState):**
```typescript
const [stats, setStats] = useState<Stats>({...});
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchStats() {
    const { data } = await supabase.rpc('get_dashboard_stats');
    // ...
  }
  fetchStats();
}, []);
```

**Po (useDashboardStats):**
```typescript
import { useDashboardStats } from '@/hooks/useDashboardStats';

const { data: dashboardStats, isLoading } = useDashboardStats();

// Computed values
const stats = {
  contacts: dashboardStats?.total_contacts ?? 0,
  todayMeetings: dashboardStats?.today_consultations ?? 0,
  pendingTasks: dashboardStats?.pending_tasks ?? 0,
  activeNeeds: dashboardStats?.active_needs ?? 0,
};
const hasNoContacts = stats.contacts === 0;
```

### Krok 3: Invalidacja cache w hookach mutacyjnych

Dodanie invalidacji `['dashboard-stats']` w:

| Hook | Plik | Linia (onSuccess) |
|------|------|-------------------|
| `useCreateContact` | `useContacts.ts` | ~194 |
| `useUpdateContact` | `useContacts.ts` | ~225 |
| `useDeleteContact` | `useContacts.ts` | ~264 |
| `useBulkUpdateContacts` | `useContacts.ts` | ~289 |
| `useBulkDeleteContacts` | `useContacts.ts` | ~315 |
| `useCreateTask` | `useTasks.ts` | ~468 |
| `useUpdateTask` | `useTasks.ts` | (do znalezienia) |
| `useDeleteTask` | `useTasks.ts` | (do znalezienia) |

Przykład zmiany:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); // DODANE
  toast.success('Kontakt został dodany');
},
```

---

## Mapowanie danych MV → Dashboard

| Pole z RPC | Użycie w Dashboard |
|------------|-------------------|
| `total_contacts` | `stats.contacts` |
| `today_consultations` | `stats.todayMeetings` |
| `pending_tasks` | `stats.pendingTasks` |
| `active_needs` | `stats.activeNeeds` |
| `new_contacts_30d` | Wzrost kontaktów (opcjonalnie) |
| `contacts_prev_30d` | Wzrost kontaktów (opcjonalnie) |
| `refreshed_at` | Debug info (opcjonalnie) |

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useDashboardStats.ts` | NOWY - hook z React Query |
| `src/pages/Dashboard.tsx` | Zamiana useEffect na useDashboardStats |
| `src/hooks/useContacts.ts` | Dodanie invalidacji `['dashboard-stats']` (5 miejsc) |
| `src/hooks/useTasks.ts` | Dodanie invalidacji `['dashboard-stats']` (3 miejsca) |
| `src/hooks/useConsultations.ts` | Dodanie invalidacji (opcjonalnie) |
| `src/hooks/useMatches.ts` | Dodanie invalidacji (opcjonalnie) |

---

## Korzyści

| Aspekt | Przed | Po |
|--------|-------|-----|
| Zarządzanie stanem | useState + useEffect | React Query |
| Cache | Brak | 2 min staleTime |
| Refetch po mutacji | Brak | Automatyczna invalidacja |
| Loading state | Ręczny | `isLoading` z React Query |
| Error handling | try/catch | `error` z React Query |
| Refetch on focus | Brak | Automatyczny |

---

## Bez zmian

- `useAnalytics.ts` - zachowany dla wykresów i AI Insights
- `AnalyticsOverview`, `AIRecommendations` - bez zmian
- Struktura bazy danych - bez zmian
- Edge Functions - bez zmian

---

## Testy weryfikacyjne

1. Załaduj `/dashboard` - StatsCard pokazują poprawne liczby
2. Dodaj kontakt - wróć na dashboard - licznik kontaktów wzrósł
3. Utwórz zadanie - `pending_tasks` wzrósł
4. Network tab - 1 request `rpc/get_dashboard_stats` zamiast wielu SELECT
5. Przełącz zakładkę i wróć - dane się odświeżają (refetchOnWindowFocus)

