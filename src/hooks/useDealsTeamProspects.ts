import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DealTeamProspect, ProspectStatus, DealPriority } from '@/types/dealTeam';

// ===== INTERNAL ROW TYPE (z public.prospects) =====
interface ProspectRow {
  id: string;
  team_id: string | null;
  tenant_id: string;
  full_name: string;
  company: string | null;
  position: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  priority: string | null;
  imported_by: string | null;
  converted_to_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToProspect(row: ProspectRow): DealTeamProspect {
  return {
    id: row.id,
    team_id: row.team_id || '',
    tenant_id: row.tenant_id,
    prospect_name: row.full_name,
    prospect_company: row.company,
    prospect_position: row.position,
    prospect_linkedin: row.linkedin_url,
    prospect_email: row.email,
    prospect_phone: row.phone,
    prospect_notes: row.notes,
    status: (row.status || 'searching') as ProspectStatus,
    found_via: null,
    intro_contact_id: null,
    assigned_to: null,
    requested_by: row.imported_by || '',
    requested_for_reason: null,
    priority: (row.priority || 'medium') as DealPriority,
    target_date: null,
    converted_to_contact_id: row.converted_to_contact_id,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

// ===== QUERIES =====

/**
 * Pobiera prospektów zespołu (źródło: prospects, source_type='team').
 * Domyślnie pomija zamknięte statusy (converted, cancelled).
 */
export function useTeamProspects(teamId: string | undefined, includeClosedStatuses = false) {
  return useQuery({
    queryKey: ['deal-team-prospects', teamId, includeClosedStatuses],
    queryFn: async () => {
      if (!teamId) return [];

      let query = supabase
        .from('prospects')
        .select('*')
        .eq('source_type', 'team')
        .eq('team_id', teamId);

      if (!includeClosedStatuses) {
        query = query.not('status', 'in', '("converted","cancelled")');
      }

      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return ((data as unknown as ProspectRow[]) || []).map(mapRowToProspect);
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
      priority = 'medium',
      notes,
    }: CreateProspectInput) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      if (!directorId) throw new Error('Brak director_id');

      const { error } = await supabase
        .from('prospects')
        .insert({
          tenant_id: tenantId,
          source_type: 'team',
          source_id: teamId,
          team_id: teamId,
          full_name: prospectName,
          company: prospectCompany || null,
          position: prospectPosition || null,
          linkedin_url: prospectLinkedin || null,
          email: prospectEmail || null,
          phone: prospectPhone || null,
          notes: notes || null,
          imported_by: directorId,
          priority,
          status: 'searching',
          is_prospecting: true,
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
      priority,
      notes,
    }: UpdateProspectInput) => {
      const updates: Record<string, unknown> = {};

      if (prospectName !== undefined) updates.full_name = prospectName;
      if (prospectCompany !== undefined) updates.company = prospectCompany;
      if (prospectPosition !== undefined) updates.position = prospectPosition;
      if (prospectLinkedin !== undefined) updates.linkedin_url = prospectLinkedin;
      if (prospectEmail !== undefined) updates.email = prospectEmail;
      if (prospectPhone !== undefined) updates.phone = prospectPhone;
      if (status !== undefined) updates.status = status;
      if (priority !== undefined) updates.priority = priority;
      if (notes !== undefined) updates.notes = notes;

      const { error } = await supabase
        .from('prospects')
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

export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('prospects')
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

export function useConvertProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, teamId }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('prospects')
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
