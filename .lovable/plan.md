

# Execute: `src/hooks/useMeetingDecisions.ts`

Plan-mode reset wymaga ponownej akceptacji. Plan bez zmian względem v2 — dorzucam tylko 3 dodatkowe checki w raporcie.

## Plik (jedyny)
- `src/hooks/useMeetingDecisions.ts` (nowy, ~95 linii)

## Pełna zawartość

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type MeetingDecisionRow = Tables<'meeting_decisions'>;

export function useMeetingDecisions(contactId: string) {
  return useQuery({
    queryKey: ['meeting-decisions', contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<MeetingDecisionRow[]> => {
      const { data, error } = await supabase
        .from('meeting_decisions')
        .select('*')
        .eq('deal_team_contact_id', contactId)
        .order('meeting_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

type CreateMeetingDecisionInput = {
  contactId: string;
  decisionType: 'go' | 'postponed' | 'dead';
  meetingDate: string;
  notes?: string | null;
  nextActionDate?: string | null;
  postponedUntil?: string | null;
  deadReason?: string | null;
};

export function useCreateMeetingDecision() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const userId = director?.id;

  return useMutation({
    mutationFn: async (input: CreateMeetingDecisionInput) => {
      if (!userId) throw new Error('Brak zalogowanego użytkownika');
      if (!tenantId) throw new Error('Brak tenant_id');

      const { contactId, decisionType, meetingDate } = input;
      const notes = input.notes ?? null;
      const nextActionDate = input.nextActionDate ?? null;
      const postponedUntil = input.postponedUntil ?? null;
      const deadReason = input.deadReason?.trim() ?? '';

      if (!['go', 'postponed', 'dead'].includes(decisionType)) {
        throw new Error('Nieprawidłowy typ decyzji');
      }
      if (!meetingDate) throw new Error('Data spotkania wymagana');
      if (decisionType === 'postponed' && !postponedUntil) {
        throw new Error('Termin odroczenia wymagany');
      }
      if (decisionType === 'dead' && !deadReason) {
        throw new Error('Powód rezygnacji wymagany');
      }

      const { data: dtc, error: fetchErr } = await supabase
        .from('deal_team_contacts')
        .select('category, offering_stage, temperature, tenant_id, team_id')
        .eq('id', contactId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!dtc) throw new Error('Kontakt nie znaleziony');

      const { error: insErr } = await supabase
        .from('meeting_decisions')
        .insert({
          tenant_id: dtc.tenant_id,
          team_id: dtc.team_id,
          deal_team_contact_id: contactId,
          decision_type: decisionType,
          meeting_date: meetingDate,
          notes,
          next_action_date: nextActionDate,
          postponed_until: decisionType === 'postponed' ? postponedUntil : null,
          dead_reason: decisionType === 'dead' ? deadReason : null,
          prev_category: dtc.category,
          prev_offering_stage: dtc.offering_stage ?? null,
          prev_temperature: dtc.temperature ?? null,
          created_by: userId,
        });
      if (insErr) throw insErr;

      return { contactId, teamId: dtc.team_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-decisions', result.contactId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      toast.success('Decyzja zapisana');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}
```

## Raport po wykonaniu

1. **Pełna treść** `src/hooks/useMeetingDecisions.ts` (paste).
2. `npx tsc --noEmit` — exit code + output.
3. `npm run lint` (lub `eslint src/hooks/useMeetingDecisions.ts`) — output.
4. `grep -rn "useMeetingDecisions" src/` — oczekuję 2 hity (definicje), zero importów.
5. `git diff --stat` — 1 plik.
6. **Dodatkowe potwierdzenia:**
   - `grep -c "^export function useMeetingDecisions" + grep -c "^export function useCreateMeetingDecision"` → po 1 każdy (brak duplikatów).
   - `grep -n "from '@/integrations/supabase/types'" plik` → import `Tables` z poprawnego źródła; `grep "@/types/dealTeam" plik` → 0 hitów.
   - `grep -E "as any|@ts-ignore|@ts-nocheck" plik` → 0 hitów.

## STOP conditions
- `tsc` exit ≠ 0 → output, brak fixu poza nowym plikiem.
- Lint errors → output, fix tylko w nowym pliku.
- Cokolwiek wymaga zmiany w innym pliku → STOP, zgłaszam.
- Któryś z 3 dodatkowych checków (duplikaty / zły import / `any`) → STOP, raport.

## Bez zmian
- `useDealsTeamContacts.ts`, `src/types/dealTeam.ts`, inne hooki, komponenty, migracje SQL.

