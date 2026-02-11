import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeEntry {
  id: string;
  date: string;
  source: 'consultation' | 'task_comment' | 'weekly_status' | 'project_note' | 'one_on_one' | 'deal_note';
  sourceLabel: string;
  content: string;
  meta?: string;
}

export function useContactKnowledge(contactId: string | undefined) {
  return useQuery({
    queryKey: ['contact-knowledge', contactId],
    queryFn: async (): Promise<KnowledgeEntry[]> => {
      if (!contactId) return [];

      const entries: KnowledgeEntry[] = [];

      // Run all queries in parallel
      const [
        consultationsRes,
        taskContactsRes,
        dealTeamContactsRes,
        projectContactsRes,
        oneOnOneRes,
      ] = await Promise.all([
        // 1. Consultations notes
        supabase
          .from('consultations')
          .select('id, scheduled_at, notes, ai_summary')
          .eq('contact_id', contactId)
          .order('scheduled_at', { ascending: false })
          .limit(10),

        // 2. Task contacts -> task_ids for comments
        supabase
          .from('task_contacts')
          .select('task_id')
          .eq('contact_id', contactId),

        // 3. Deal team contacts -> weekly statuses
        supabase
          .from('deal_team_contacts')
          .select('id, notes')
          .eq('contact_id', contactId),

        // 4. Project contacts -> project_ids for notes
        supabase
          .from('project_contacts')
          .select('project_id')
          .eq('contact_id', contactId),

        // 5. One-on-one meetings (contact can be in either side)
        supabase
          .from('one_on_one_meetings')
          .select('id, created_at, notes, outcome')
          .or(`contact_a_id.eq.${contactId},contact_b_id.eq.${contactId}`)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Process consultations
      (consultationsRes.data || []).forEach((c) => {
        const content = c.notes || c.ai_summary;
        if (content) {
          entries.push({
            id: `cons-${c.id}`,
            date: c.scheduled_at,
            source: 'consultation',
            sourceLabel: 'Konsultacja',
            content: content.substring(0, 300),
          });
        }
      });

      // Process task comments (need second query)
      const taskIds = (taskContactsRes.data || []).map((t) => t.task_id);
      if (taskIds.length > 0) {
        const { data: comments } = await supabase
          .from('task_comments')
          .select('id, content, created_at, task_id')
          .in('task_id', taskIds)
          .order('created_at', { ascending: false })
          .limit(10);

        (comments || []).forEach((c) => {
          entries.push({
            id: `tc-${c.id}`,
            date: c.created_at,
            source: 'task_comment',
            sourceLabel: 'Komentarz zadania',
            content: c.content.substring(0, 300),
          });
        });
      }

      // Process deal team weekly statuses
      const dealContactIds = (dealTeamContactsRes.data || []).map((d) => d.id);
      if (dealContactIds.length > 0) {
        const { data: statuses } = await supabase
          .from('deal_team_weekly_statuses')
          .select('id, week_start, status_summary, next_steps, blockers')
          .in('team_contact_id', dealContactIds)
          .order('created_at', { ascending: false })
          .limit(10);

        (statuses || []).forEach((s) => {
          const parts = [s.status_summary];
          if (s.next_steps) parts.push(`→ ${s.next_steps}`);
          if (s.blockers) parts.push(`⚠ ${s.blockers}`);
          entries.push({
            id: `ws-${s.id}`,
            date: s.week_start,
            source: 'weekly_status',
            sourceLabel: 'Status tygodniowy',
            content: parts.join(' | ').substring(0, 300),
          });
        });

        // Deal notes (from deal_team_contacts)
        (dealTeamContactsRes.data || []).forEach((d) => {
          if (d.notes) {
            entries.push({
              id: `dn-${d.id}`,
              date: new Date().toISOString(),
              source: 'deal_note',
              sourceLabel: 'Notatka Kanban',
              content: d.notes.substring(0, 300),
            });
          }
        });
      }

      // Process project notes
      const projectIds = (projectContactsRes.data || []).map((p) => p.project_id);
      if (projectIds.length > 0) {
        const { data: projectNotes } = await supabase
          .from('project_notes')
          .select('id, content, created_at')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(10);

        (projectNotes || []).forEach((n) => {
          if (n.content) {
            entries.push({
              id: `pn-${n.id}`,
              date: n.created_at,
              source: 'project_note',
              sourceLabel: 'Notatka projektowa',
              content: n.content.substring(0, 300),
            });
          }
        });
      }

      // Process 1:1 meetings
      (oneOnOneRes.data || []).forEach((m) => {
        if (m.notes) {
          entries.push({
            id: `1on1-${m.id}`,
            date: m.created_at || new Date().toISOString(),
            source: 'one_on_one',
            sourceLabel: 'Spotkanie 1:1',
            content: m.notes.substring(0, 300),
          });
        }
      });

      // Sort by date descending
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return entries;
    },
    enabled: !!contactId,
    staleTime: 60 * 1000,
  });
}
