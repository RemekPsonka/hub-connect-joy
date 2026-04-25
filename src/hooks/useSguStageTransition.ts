import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  STAGE_ACTIONS, buildTaskTitle, type SguStage,
} from '@/lib/sgu/stageActionMap';

interface TransitionInput {
  /** team_id (deal_team_id). */
  teamId: string;
  /** deal_team_contacts.id */
  teamContactId: string;
  /** contacts.id */
  contactId: string;
  /** Display name + firma (do tytułu nowego taska). */
  contactName: string;
  contactCompany?: string | null;
  /** Docelowy etap. Jeśli null — nie tworzy nowego taska (np. po `won → client`). */
  nextStage: SguStage | null;
  /** Task do zamknięcia (lub null jeśli to ghost-row). */
  sourceTaskId: string | null;
  /** Opcjonalny due_date dla nowego taska (ISO yyyy-mm-dd). */
  newTaskDueDate?: string | null;
  /** Dodatkowe pola do update na deal_team_contacts (np. premium). */
  contactPatch?: Record<string, unknown>;
}

/**
 * Pojedyncza tranzycja etapu lejka SGU:
 *   1) zamknij stary task (status='completed')
 *   2) zaktualizuj deal_team_contacts.offering_stage (+ ewentualnie inne pola)
 *   3) utwórz nowy task dla nextStage (jeśli != null)
 *
 * Trigger DB `ensure_active_task_per_lead` zadba też niezależnie o ghost rows,
 * ten hook robi to samo synchronicznie żeby UI nie musiał czekać na realtime.
 */
export function useSguStageTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransitionInput) => {
      const {
        teamId, teamContactId, contactId, contactName, contactCompany,
        nextStage, sourceTaskId, newTaskDueDate, contactPatch,
      } = input;

      // 1) close source task (skip if ghost)
      if (sourceTaskId && !sourceTaskId.startsWith('ghost:')) {
        const { error } = await supabase
          .from('tasks')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', sourceTaskId);
        if (error) throw error;
      }

      // 2) update contact stage (+ optional patch)
      const patch: Record<string, unknown> = { ...(contactPatch ?? {}) };
      if (nextStage) patch.offering_stage = nextStage;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase
          .from('deal_team_contacts')
          .update(patch)
          .eq('id', teamContactId);
        if (error) throw error;
      }

      // 3) create next task (only if nextStage given)
      if (nextStage) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data: director } = await supabase
          .from('directors')
          .select('id, tenant_id')
          .eq('user_id', user.id)
          .single();
        if (!director) throw new Error('Brak directora');

        // Właściciel kontaktu = osoba odpowiedzialna za task. Fallback: klikający.
        const { data: dtcOwner } = await supabase
          .from('deal_team_contacts')
          .select('assigned_to')
          .eq('id', teamContactId)
          .maybeSingle();
        const assignedDirectorId: string = dtcOwner?.assigned_to ?? director.id;

        // Mapuj director.id → user_id (filtr "Moje" w /sgu/zadania używa assigned_to_user_id).
        const { data: assignedDirector } = await supabase
          .from('directors')
          .select('user_id')
          .eq('id', assignedDirectorId)
          .maybeSingle();
        const assignedUserId: string = assignedDirector?.user_id ?? user.id;

        const title = buildTaskTitle(nextStage, contactName, contactCompany);
        const { data: newTask, error: tErr } = await supabase
          .from('tasks')
          .insert({
            tenant_id: director.tenant_id,
            owner_id: director.id,
            deal_team_id: teamId,
            deal_team_contact_id: teamContactId,
            title,
            status: 'todo',
            priority: 'medium',
            due_date: newTaskDueDate ?? null,
            visibility: 'team',
            assigned_to: assignedDirectorId,
            assigned_to_user_id: assignedUserId,
          })
          .select('id')
          .single();
        if (tErr) throw tErr;

        // task_contacts join (primary)
        if (newTask?.id) {
          await supabase.from('task_contacts').insert({
            task_id: newTask.id,
            contact_id: contactId,
            role: 'primary',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments-all'] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Etap zaktualizowany');
    },
    onError: (e: Error) => {
      toast.error(`Błąd: ${e.message}`);
    },
  });
}

export { STAGE_ACTIONS };
