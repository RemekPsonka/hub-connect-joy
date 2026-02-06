

# Plan: Typy TypeScript + Hooki: useDealsTeam + useDealsTeamContacts

## Cel
Utworzenie warstwy danych React dla modułu Deal Teams: plik typów TypeScript oraz 2 hooki z React Query do zarządzania zespołami i kontaktami dealowymi.

## Analiza istniejącego kodu

### Wzorce z projektu
Przeanalizowano `useContacts.ts` i `useDealTeams.ts`:
- Import: `useQuery`, `useMutation`, `useQueryClient` z `@tanstack/react-query`
- Import: `supabase` z `@/integrations/supabase/client`
- Import: `useAuth` z `@/contexts/AuthContext`
- Import: `toast` z `sonner`
- Pattern: `tenantId = director?.tenant_id || assistant?.tenant_id`
- Pattern: `enabled: !!tenantId && !!directorId`
- Pattern: `staleTime: 5 * 60 * 1000` dla stabilnych danych

### Istniejący hook `useDealTeams.ts`
Już zawiera podstawowe operacje na zespołach:
- `useDealTeams()` — wszystkie zespoły w tenant
- `useMyDealTeams()` — zespoły zalogowanego directora
- `useCreateDealTeam()` / `useUpdateDealTeam()` / `useDeleteDealTeam()`
- `useDealTeamWithMembers()` — zespół z członkami

**Wniosek**: Nie duplikujemy tego hooka — rozszerzamy o brakujące funkcje członków.

## Pliki do utworzenia

### 1. `src/types/dealTeam.ts` — Typy TypeScript

Definiuje union types i interfejsy dla całego modułu Deal Teams:

```text
UNION TYPES:
├── DealTeamRole: 'leader' | 'member' | 'viewer'
├── DealCategory: 'hot' | 'top' | 'lead'
├── DealContactStatus: 'active' | 'on_hold' | 'won' | 'lost' | 'disqualified'
├── DealPriority: 'low' | 'medium' | 'high' | 'urgent'
├── ProspectStatus: 'searching' | 'found_connection' | 'intro_sent' | ...
├── AssignmentStatus: 'pending' | 'in_progress' | 'done' | 'cancelled'
└── CategoryRecommendation: 'keep' | 'promote' | 'demote' | 'close_won' | 'close_lost'

INTERFACES:
├── DealTeamContact — kontakt dealowy z JOINami (contact, assigned_director)
├── DealTeamContactStats — zagregowane statystyki zespołu
├── DealTeamProspect — poszukiwany kontakt
├── DealTeamWeeklyStatus — cotygodniowy raport
├── DealTeamAssignment — zadanie operacyjne
└── DealTeamActivityLogEntry — wpis w logu aktywności
```

### 2. `src/hooks/useDealsTeamMembers.ts` — Zarządzanie członkami

Rozszerzenie funkcjonalności członków (nie duplikujemy istniejącego `useDealTeams.ts`):

```text
QUERIES:
├── useTeamMembers(teamId) — członkowie z JOIN directors
└── useDirectorsByTenant() — wszyscy directors do wyboru

MUTATIONS:
├── useAddTeamMember() — dodaj directora do zespołu
├── useRemoveTeamMember() — soft delete (is_active = false)
└── useUpdateMemberRole() — zmiana roli (leader/member/viewer)
```

### 3. `src/hooks/useDealsTeamContacts.ts` — Kontakty dealowe

Główny hook do zarządzania kontaktami w zespole:

```text
QUERIES:
├── useTeamContacts(teamId, category?) — lista z JOIN contacts
├── useTeamContact(id) — pojedynczy kontakt
└── useTeamContactStats(teamId) — statystyki (obliczane z danych)

MUTATIONS:
├── useAddContactToTeam() — dodaj kontakt CRM do zespołu
├── useUpdateTeamContact() — edycja pól (category, status, assigned_to, ...)
├── useRemoveContactFromTeam() — DELETE rekordu
└── usePromoteContact() — zmiana kategorii z walidacją
```

## Szczegóły implementacji

### Typ `DealTeamContact` z JOINami

```typescript
export interface DealTeamContact {
  id: string;
  team_id: string;
  contact_id: string;
  tenant_id: string;
  category: DealCategory;
  status: DealContactStatus;
  assigned_to: string | null;
  priority: DealPriority;
  // ... pozostałe pola z tabeli
  status_overdue: boolean;
  
  // JOIN z contacts
  contact?: {
    id: string;
    full_name: string;
    company: string | null;
    position: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
  };
  
  // JOIN z directors (assigned_to)
  assigned_director?: {
    id: string;
    full_name: string;
  };
}
```

### Query `useTeamContacts`

```typescript
const { data } = await supabase
  .from('deal_team_contacts')
  .select(`
    *,
    contact:contacts(id, full_name, company, position, email, phone, city)
  `)
  .eq('team_id', teamId)
  .not('status', 'in', '("won","lost","disqualified")');

// Uwaga: JOIN z directors przez FK logiczne może nie działać
// Alternatywa: pobierz assigned_director osobno lub rozwiąż z listy członków
```

### Statystyki obliczane z danych

```typescript
export function useTeamContactStats(teamId: string) {
  const { data: contacts = [] } = useTeamContacts(teamId);
  
  const stats = useMemo(() => ({
    hot_count: contacts.filter(c => c.category === 'hot').length,
    top_count: contacts.filter(c => c.category === 'top').length,
    lead_count: contacts.filter(c => c.category === 'lead').length,
    overdue_count: contacts.filter(c => c.status_overdue).length,
    total_value: contacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0),
    upcoming_meetings: contacts.filter(c => 
      c.next_meeting_date && new Date(c.next_meeting_date) > new Date()
    ).length,
  }), [contacts]);
  
  return stats;
}
```

### Mutacja `usePromoteContact` z walidacją

```typescript
export function usePromoteContact() {
  return useMutation({
    mutationFn: async ({ id, newCategory }: { id: string; newCategory: DealCategory }) => {
      // Pobierz aktualny kontakt
      const { data: contact } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('id', id)
        .single();
      
      // Walidacja wymaganych pól
      if (newCategory === 'top' && !contact.assigned_to) {
        throw new Error('Promocja do TOP wymaga przypisania osoby odpowiedzialnej');
      }
      if (newCategory === 'hot' && !contact.next_meeting_date) {
        throw new Error('Promocja do HOT wymaga zaplanowanego spotkania');
      }
      
      // Aktualizacja kategorii
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({ category: newCategory })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      toast.success('Kategoria została zmieniona');
    },
  });
}
```

## Query Keys

```text
deal-team-members     : ['deal-team-members', teamId]
deal-team-contacts    : ['deal-team-contacts', teamId, category || 'all']
deal-team-contact     : ['deal-team-contact', id]
tenant-directors      : ['tenant-directors', tenantId]
```

## Cache Invalidation

| Mutacja | Invalidate |
|---------|------------|
| useAddTeamMember | `['deal-team-members', teamId]` |
| useRemoveTeamMember | `['deal-team-members', teamId]` |
| useUpdateMemberRole | `['deal-team-members', teamId]` |
| useAddContactToTeam | `['deal-team-contacts', teamId]` |
| useUpdateTeamContact | `['deal-team-contacts']`, `['deal-team-contact', id]` |
| useRemoveContactFromTeam | `['deal-team-contacts', teamId]` |
| usePromoteContact | `['deal-team-contacts', teamId]` |

## Struktura plików

```text
src/
├── types/
│   └── dealTeam.ts              ← NOWY: typy i interfejsy
└── hooks/
    ├── useDealTeams.ts          ← ISTNIEJĄCY (nie modyfikujemy)
    ├── useDealsTeamMembers.ts   ← NOWY: zarządzanie członkami
    └── useDealsTeamContacts.ts  ← NOWY: kontakty dealowe
```

## Guardrails ✓
- NIE modyfikuję istniejącego `useDealTeams.ts`
- NIE tworzę komponentów UI ani stron
- NIE tworzę migracji SQL
- Użycie `useAuth()` do pobrania `director.id` i `director.tenant_id`
- Obsługa błędów przez `toast.error()` w `onError`
- Fallback dla JOIN directors przez FK logiczne (rozwiązanie po stronie klienta)

