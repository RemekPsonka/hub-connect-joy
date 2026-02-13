import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface WeeklyStatus {
  id: string;
  team_id: string;
  team_contact_id: string;
  tenant_id: string;
  week_start: string;
  status_summary: string;
  next_steps: string | null;
  blockers: string | null;
  meeting_happened: boolean | null;
  meeting_outcome: string | null;
  category_recommendation: string | null;
  reported_by: string;
  created_at: string | null;
  reporter?: {
    id: string;
    full_name: string;
  };
  team_contact?: {
    id: string;
    contact_id: string;
    category: string;
    contact?: {
      id: string;
      full_name: string;
      company: string | null;
    };
  };
}

export interface SubmitWeeklyStatusInput {
  teamId: string;
  teamContactId: string;
  statusSummary: string;
  nextSteps?: string;
  blockers?: string;
  meetingHappened?: boolean;
  meetingOutcome?: string;
  categoryRecommendation?: 'keep' | 'promote' | 'demote' | 'close_won' | 'close_lost' | 'hot' | 'cold' | 'snooze' | 'convert_client';
}

// ===== QUERIES =====

/**
 * Pobiera statusy złożone w bieżącym tygodniu dla zespołu
 */
export function useWeeklyStatuses(teamId: string | undefined) {
  return useQuery({
    queryKey: ['weekly-statuses', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      // Oblicz początek i koniec bieżącego tygodnia (poniedziałek-niedziela)
      const now = new Date();
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('deal_team_weekly_statuses')
        .select('*')
        .eq('team_id', teamId)
        .gte('week_start', weekStart)
        .lte('week_start', weekEnd)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch reporters
      const reporterIds = [...new Set(data.map(s => s.reported_by))];
      const { data: reporters } = await supabase
        .from('directors')
        .select('id, full_name')
        .in('id', reporterIds);

      const reporterMap = new Map(reporters?.map(r => [r.id, r]) || []);

      // Pobierz powiązane kontakty zespołowe
      const teamContactIds = [...new Set((data || []).map(s => s.team_contact_id))];
      if (teamContactIds.length === 0) return [];

      const { data: teamContacts } = await supabase
        .from('deal_team_contacts')
        .select('id, contact_id, category')
        .in('id', teamContactIds);

      // Pobierz kontakty CRM
      const contactIds = [...new Set((teamContacts || []).map(tc => tc.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .in('id', contactIds);

      const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);
      const teamContactMap = new Map(
        (teamContacts || []).map(tc => [
          tc.id,
          { ...tc, contact: contactMap.get(tc.contact_id) },
        ])
      );

      return data.map(status => ({
        ...status,
        reporter: reporterMap.get(status.reported_by),
        team_contact: teamContactMap.get(status.team_contact_id),
      })) as WeeklyStatus[];
    },
    enabled: !!teamId,
    staleTime: 60 * 1000, // 1 minuta
  });
}

/**
 * Pobiera kontakty HOT/TOP z przeterminowanym statusem (>7 dni bez aktualizacji)
 */
export function useOverdueContacts(teamId: string | undefined) {
  return useQuery({
    queryKey: ['overdue-contacts', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      // Pobierz kontakty zespołowe z flagą status_overdue
      const { data: dealContacts, error } = await supabase
        .from('deal_team_contacts')
        .select('*')
        .eq('team_id', teamId)
        .eq('status_overdue', true)
        .in('category', ['hot', 'top'])
        .not('status', 'in', '("won","lost","disqualified")')
        .order('last_status_update', { ascending: true, nullsFirst: true });

      if (error) throw error;
      if (!dealContacts || dealContacts.length === 0) return [];

      // Pobierz powiązane kontakty CRM
      const contactIds = [...new Set(dealContacts.map(dc => dc.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name, company, position')
        .in('id', contactIds);

      const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);

      return dealContacts.map(dc => ({
        ...dc,
        contact: contactMap.get(dc.contact_id),
        daysWithoutStatus: dc.last_status_update
          ? Math.floor(
              (Date.now() - new Date(dc.last_status_update).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      }));
    },
    enabled: !!teamId,
    staleTime: 60 * 1000,
  });
}

// ===== MUTATIONS =====

/**
 * Dodaje nowy cotygodniowy status
 */
export function useSubmitWeeklyStatus() {
  const queryClient = useQueryClient();
  const { director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  const directorId = director?.id;

  return useMutation({
    mutationFn: async ({
      teamId,
      teamContactId,
      statusSummary,
      nextSteps,
      blockers,
      meetingHappened,
      meetingOutcome,
      categoryRecommendation,
    }: SubmitWeeklyStatusInput) => {
      if (!tenantId) throw new Error('Brak tenant_id');
      if (!directorId) throw new Error('Brak director_id');

      // Oblicz początek bieżącego tygodnia
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Wstaw status
      const { error: insertError } = await supabase
        .from('deal_team_weekly_statuses')
        .insert({
          team_id: teamId,
          team_contact_id: teamContactId,
          tenant_id: tenantId,
          week_start: weekStart,
          status_summary: statusSummary,
          next_steps: nextSteps || null,
          blockers: blockers || null,
          meeting_happened: meetingHappened || false,
          meeting_outcome: meetingOutcome || null,
          category_recommendation: categoryRecommendation || 'keep',
          reported_by: directorId,
        });

      if (insertError) {
        // Sprawdź czy to błąd UNIQUE
        if (insertError.code === '23505') {
          throw new Error('Status na ten tydzień już istnieje');
        }
        throw insertError;
      }

      // Zaktualizuj last_status_update w deal_team_contacts
      await supabase
        .from('deal_team_contacts')
        .update({ last_status_update: new Date().toISOString() })
        .eq('id', teamContactId);

      return { teamId, teamContactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-statuses', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['overdue-contacts', result.teamId] });
      queryClient.invalidateQueries({ queryKey: ['deal-team-contacts', result.teamId] });
      toast.success('Status zapisany');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
