import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Sprint 18 — bridge hook nad VIEW public.unified_meetings.
// Łączy konsultacje (`consultations`) i spotkania grupowe (`group_meetings`).
// Nie zastępuje istniejącego `useMeetings` (ten dalej operuje na group_meetings).

export type UnifiedMeetingType = 'consultation' | 'group';
export type UnifiedMeetingSource = 'consultations' | 'group_meetings';

export interface UnifiedMeeting {
  id: string;
  type: UnifiedMeetingType;
  tenant_id: string;
  scheduled_at: string;
  duration: number | null;
  location: string | null;
  notes: string | null;
  status: string | null;
  contact_id_main: string | null;
  source_table: UnifiedMeetingSource;
  created_at: string;
  updated_at: string;
}

export interface UnifiedMeetingsParams {
  type?: UnifiedMeetingType | 'all';
  contactId?: string;
  range?: { from?: string; to?: string };
  limit?: number;
}

export function useUnifiedMeetings(params: UnifiedMeetingsParams = {}) {
  const { type = 'all', contactId, range, limit = 200 } = params;

  return useQuery({
    queryKey: ['unified-meetings', type, contactId ?? null, range?.from ?? null, range?.to ?? null, limit],
    queryFn: async (): Promise<UnifiedMeeting[]> => {
      // VIEW nie jest w types.ts → cast na unknown.
      let query = (supabase as unknown as { from: (n: string) => any })
        .from('unified_meetings')
        .select('*')
        .order('scheduled_at', { ascending: false })
        .limit(limit);

      if (type !== 'all') query = query.eq('type', type);
      if (range?.from) query = query.gte('scheduled_at', range.from);
      if (range?.to) query = query.lte('scheduled_at', range.to);

      const { data, error } = await query;
      if (error) throw error;
      let rows = (data ?? []) as UnifiedMeeting[];

      // Filtr po kontakcie: dla konsultacji to `contact_id_main`,
      // dla spotkań grupowych musimy zajrzeć do `meeting_participants`.
      if (contactId) {
        const consultationMatches = rows.filter(
          (r) => r.type === 'consultation' && r.contact_id_main === contactId,
        );

        const groupRows = rows.filter((r) => r.type === 'group');
        let groupMatches: UnifiedMeeting[] = [];
        if (groupRows.length > 0) {
          const groupIds = groupRows.map((r) => r.id);
          const { data: parts, error: partsErr } = await supabase
            .from('meeting_participants')
            .select('meeting_id')
            .eq('contact_id', contactId)
            .in('meeting_id', groupIds);
          if (partsErr) throw partsErr;
          const allowed = new Set((parts ?? []).map((p) => p.meeting_id));
          groupMatches = groupRows.filter((r) => allowed.has(r.id));
        }

        rows = [...consultationMatches, ...groupMatches].sort((a, b) =>
          a.scheduled_at < b.scheduled_at ? 1 : -1,
        );
      }

      return rows;
    },
  });
}
