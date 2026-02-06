import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DealTeamProspect, ProspectStatus, DealPriority } from '@/types/dealTeam';

// ===== QUERIES =====

/**
 * Pobiera prospektów zespołu
 * Domyślnie pomija zamknięte statusy (converted, cancelled)
 */
export function useTeamProspects(teamId: string | undefined, includeClosedStatuses = false) {
  return useQuery({
    queryKey: ['deal-team-prospects', teamId, includeClosedStatuses],
    queryFn: async () => {
      if (!teamId) return [];

      let query = supabase
        .from('deal_team_prospects')
        .select('*')
        .eq('team_id', teamId);

      if (!includeClosedStatuses) {
        query = query.not('status', 'in', '("converted","cancelled")');
      }

      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Map database fields to our interface
      return (data || []).map(row => ({
        id: row.id,
        team_id: row.team_id,
        tenant_id: row.tenant_id,
        prospect_name: row.prospect_name,
        prospect_company: row.prospect_company,
        prospect_position: row.prospect_position,
        prospect_linkedin: row.prospect_linkedin,
        prospect_email: row.prospect_email,
        prospect_phone: row.prospect_phone,
        prospect_notes: row.prospect_notes,
        status: row.status as ProspectStatus,
        found_via: row.found_via,
        intro_contact_id: row.intro_contact_id,
        assigned_to: row.assigned_to,
        requested_by: row.requested_by,
        requested_for_reason: row.requested_for_reason,
        priority: (row.priority || 'medium') as DealPriority,
        target_date: row.target_date,
        converted_to_contact_id: row.converted_to_contact_id,
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
      })) as DealTeamProspect[];
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  });
}

// ===== MUTATIONS =====

export interface CreateProspectInput {
  teamId: string;
  prospectName: string;
  prospectCompany?: string;
  prospectPosition?: string;
  prospectLinkedin?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  assignedTo?: string;
  priority?: DealPriority;
  notes?: string;
  targetDate?: string;
}

/**
 * Tworzy nowego prospekta (poszukiwanego)
 */
export function useCreateProspect() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const directorId = director?.id;

  return useMutation({
    mutationFn: async ({
      teamId,
      prospectName,
      prospectCompany,
      prospectPosition,
      prospectLinkedin,
      prospectEmail,
      prospectPhone,
      assignedTo,
      priority = 'medium',
      notes,
      targetDate,
    }: CreateProspectInput) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      if (!directorId) throw new Error('Brak director_id');

      const { error } = await supabase
        .from('deal_team_prospects')
        .insert({
          team_id: teamId,
          tenant_id: tenantId,
          prospect_name: prospectName,
          prospect_company: prospectCompany || null,
          prospect_position: prospectPosition || null,
          prospect_linkedin: prospectLinkedin || null,
          prospect_email: prospectEmail || null,
          prospect_phone: prospectPhone || null,
          prospect_notes: notes || null,
          assigned_to: assignedTo || null,
          requested_by: directorId,
          priority,
          target_date: targetDate || null,
          status: 'searching',
        });

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-prospects', result.teamId] });
      toast.success('Poszukiwany został dodany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

export interface UpdateProspectInput {
  id: string;
  teamId: string;
  prospectName?: string;
  prospectCompany?: string;
  prospectPosition?: string;
  prospectLinkedin?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  status?: ProspectStatus;
  assignedTo?: string | null;
  priority?: DealPriority;
  notes?: string | null;
  foundVia?: string | null;
}

/**
 * Aktualizuje dane prospekta
 */
export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      teamId,
      prospectName,
      prospectCompany,
      prospectPosition,
      prospectLinkedin,
      prospectEmail,
      prospectPhone,
      status,
      assignedTo,
      priority,
      notes,
      foundVia,
    }: UpdateProspectInput) => {
      const updates: Record<string, unknown> = {};

      if (prospectName !== undefined) updates.prospect_name = prospectName;
      if (prospectCompany !== undefined) updates.prospect_company = prospectCompany;
      if (prospectPosition !== undefined) updates.prospect_position = prospectPosition;
      if (prospectLinkedin !== undefined) updates.prospect_linkedin = prospectLinkedin;
      if (prospectEmail !== undefined) updates.prospect_email = prospectEmail;
      if (prospectPhone !== undefined) updates.prospect_phone = prospectPhone;
      if (status !== undefined) updates.status = status;
      if (assignedTo !== undefined) updates.assigned_to = assignedTo;
      if (priority !== undefined) updates.priority = priority;
      if (notes !== undefined) updates.prospect_notes = notes;
      if (foundVia !== undefined) updates.found_via = foundVia;

      const { error } = await supabase
        .from('deal_team_prospects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-prospects', result.teamId] });
      toast.success('Poszukiwany został zaktualizowany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

/**
 * Usuwa prospekta
 */
export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('deal_team_prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-prospects', result.teamId] });
      toast.success('Poszukiwany został usunięty');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}

/**
 * Konwertuje prospekta do kontaktu LEAD (placeholder - wymaga więcej logiki)
 */
export function useConvertProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      // Placeholder - w przyszłości: utwórz kontakt CRM, dodaj do zespołu jako LEAD
      const { error } = await supabase
        .from('deal_team_prospects')
        .update({ status: 'converted' })
        .eq('id', id);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deal-team-prospects', result.teamId] });
      toast.success('Poszukiwany został skonwertowany');
    },
    onError: (error: Error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });
}
