import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RepAssignment } from '@/types/sgu-representative';

interface UnassignedContact {
  id: string;
  full_name: string | null;
  company_name: string | null;
  status: string | null;
}

interface RepWithAssignments {
  user_id: string;
  full_name: string;
  contacts: UnassignedContact[];
}

export function useRepAssignmentsBoard(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['sgu-rep-assignments', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      // Active reps in this team's tenant
      const { data: reps, error: repsErr } = await supabase
        .from('sgu_representative_profiles')
        .select('user_id, first_name, last_name')
        .eq('active', true)
        .order('last_name');
      if (repsErr) throw repsErr;

      // All deal_team_contacts of this team
      const { data: contacts, error: contactsErr } = await supabase
        .from('deal_team_contacts')
        .select('id, full_name, company_name, status')
        .eq('team_id', teamId!);
      if (contactsErr) throw contactsErr;

      // Active assignments for this team
      const { data: assignments, error: assignErr } = await supabase
        .from('deal_team_representative_assignments')
        .select('id, deal_team_contact_id, representative_user_id, active')
        .eq('team_id', teamId!)
        .eq('active', true);
      if (assignErr) throw assignErr;

      const assignmentMap = new Map<string, string>();
      for (const a of assignments ?? []) {
        assignmentMap.set(a.deal_team_contact_id, a.representative_user_id);
      }

      const repColumns: RepWithAssignments[] = (reps ?? []).map((r) => ({
        user_id: r.user_id,
        full_name: `${r.first_name} ${r.last_name}`,
        contacts: [],
      }));
      const repIndex = new Map(repColumns.map((r) => [r.user_id, r] as const));
      const unassigned: UnassignedContact[] = [];

      for (const c of contacts ?? []) {
        const repId = assignmentMap.get(c.id);
        const card: UnassignedContact = {
          id: c.id,
          full_name: c.full_name,
          company_name: c.company_name,
          status: c.status,
        };
        if (repId && repIndex.has(repId)) {
          repIndex.get(repId)!.contacts.push(card);
        } else {
          unassigned.push(card);
        }
      }

      return { unassigned, reps: repColumns };
    },
  });
}

export function useAssignContactToRep(teamId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contactId,
      repUserId,
      tenantId,
    }: {
      contactId: string;
      repUserId: string | null;
      tenantId: string;
    }) => {
      // Deactivate current active assignment for this contact (if any)
      const { error: deactErr } = await supabase
        .from('deal_team_representative_assignments')
        .update({ active: false, unassigned_at: new Date().toISOString() })
        .eq('deal_team_contact_id', contactId)
        .eq('active', true);
      if (deactErr) throw deactErr;

      // If repUserId is null, just unassign
      if (!repUserId) return;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase
        .from('deal_team_representative_assignments')
        .insert({
          tenant_id: tenantId,
          team_id: teamId!,
          deal_team_contact_id: contactId,
          representative_user_id: repUserId,
          assigned_by_user_id: user?.id ?? null,
          active: true,
        });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sgu-rep-assignments'] });
    },
    onError: (e: Error) => toast.error(`Błąd przypisania: ${e.message}`),
  });
}

export type { RepWithAssignments, UnassignedContact };
