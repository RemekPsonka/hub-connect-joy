

# Wyświetlanie zespołu w szczegółach Deal

## Problem
W szczegółach deala nie wyświetla się informacja o przypisanym zespole ani o jego członkach. Aktualnie `useDeal` pobiera tylko podstawowe dane zespołu (`id, name, color`), ale nie pobiera członków.

## Rozwiązanie
Dodanie sekcji "Zespół" w widoku szczegółów deala z:
- Nazwą zespołu (z kolorowym badge)
- Listą członków zespołu (z avatarami/imionami)

## Zmiany

### 1. Nowy hook do pobierania zespołu z członkami

**Plik:** `src/hooks/useDealTeams.ts`

Nowa funkcja `useDealTeamWithMembers(teamId)` która pobiera konkretny zespół wraz z jego członkami:

```typescript
export function useDealTeamWithMembers(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['deal_team', teamId],
    queryFn: async () => {
      if (!teamId) return null;

      const { data, error } = await supabase
        .from('deal_teams')
        .select(`
          *,
          members:deal_team_members(
            id,
            director_id,
            director:directors(id, full_name, email)
          )
        `)
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return data as DealTeam;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
}
```

### 2. Aktualizacja DealDetail.tsx

**Plik:** `src/pages/DealDetail.tsx`

W sekcji "Szczegóły" dodanie informacji o zespole:

```tsx
import { useDealTeamWithMembers } from '@/hooks/useDealTeams';
import { Users2 } from 'lucide-react';

// W komponencie:
const { data: teamDetails } = useDealTeamWithMembers(deal.team_id);

// W sekcji CardContent po deal.owner:
{teamDetails && (
  <div className="flex items-start gap-3">
    <Users2 className="h-4 w-4 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">Zespół</p>
      <Badge
        variant="outline"
        style={{ borderColor: teamDetails.color, color: teamDetails.color }}
      >
        {teamDetails.name}
      </Badge>
      {teamDetails.members && teamDetails.members.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {teamDetails.members.map((m) => (
            <span key={m.id} className="text-sm text-muted-foreground">
              {m.director?.full_name}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useDealTeams.ts` | Nowy hook `useDealTeamWithMembers` |
| `src/pages/DealDetail.tsx` | Sekcja zespołu z listą członków |

## Efekt
Po przypisaniu deala do zespołu (np. "SGU"), w szczegółach deala pojawi się:
- Badge z nazwą zespołu "SGU" w kolorze zespołu
- Lista członków: "Remek, Adam, Paweł"

