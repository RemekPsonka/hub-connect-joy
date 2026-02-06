import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EventLink {
  linkId: string;
  type: 'task' | 'contact' | 'project';
  id: string;
  name: string;
}

// ─── Links for a specific GCal event ────────────────────────────────
export function useEventLinks(gcalEventId: string | null) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['gcal-links', gcalEventId],
    queryFn: async (): Promise<EventLink[]> => {
      if (!gcalEventId) return [];

      const { data: links, error } = await supabase
        .from('gcal_event_links')
        .select('id, linked_type, linked_id')
        .eq('tenant_id', tenantId!)
        .eq('gcal_event_id', gcalEventId);

      if (error) throw error;
      if (!links || links.length === 0) return [];

      // Group by type for batch resolution
      const taskIds = links.filter(l => l.linked_type === 'task').map(l => l.linked_id);
      const contactIds = links.filter(l => l.linked_type === 'contact').map(l => l.linked_id);
      const projectIds = links.filter(l => l.linked_type === 'project').map(l => l.linked_id);

      const [tasksRes, contactsRes, projectsRes] = await Promise.all([
        taskIds.length > 0
          ? supabase.from('tasks').select('id, title').in('id', taskIds)
          : Promise.resolve({ data: [] }),
        contactIds.length > 0
          ? supabase.from('contacts').select('id, full_name').in('id', contactIds)
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase.from('projects').select('id, name').in('id', projectIds)
          : Promise.resolve({ data: [] }),
      ]);

      const nameMap = new Map<string, string>();
      tasksRes.data?.forEach((t: any) => nameMap.set(t.id, t.title));
      contactsRes.data?.forEach((c: any) => nameMap.set(c.id, c.full_name));
      projectsRes.data?.forEach((p: any) => nameMap.set(p.id, p.name));

      return links.map(l => ({
        linkId: l.id,
        type: l.linked_type as EventLink['type'],
        id: l.linked_id,
        name: nameMap.get(l.linked_id) || 'Nieznany',
      }));
    },
    enabled: !!tenantId && !!gcalEventId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Create a link ──────────────────────────────────────────────────
export function useCreateEventLink() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      gcalEventId: string;
      gcalCalendarId: string;
      linkedType: 'task' | 'contact' | 'project';
      linkedId: string;
    }) => {
      if (!director) throw new Error('Brak dyrektora');

      const { error } = await supabase.from('gcal_event_links').insert({
        tenant_id: director.tenant_id,
        director_id: director.id,
        gcal_event_id: params.gcalEventId,
        gcal_calendar_id: params.gcalCalendarId,
        linked_type: params.linkedType,
        linked_id: params.linkedId,
      });

      if (error) {
        if (error.code === '23505') throw new Error('To powiązanie już istnieje');
        throw error;
      }

      return params.gcalEventId;
    },
    onSuccess: (gcalEventId) => {
      queryClient.invalidateQueries({ queryKey: ['gcal-links', gcalEventId] });
      toast.success('Powiązano');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Remove a link ──────────────────────────────────────────────────
export function useRemoveEventLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { linkId: string; gcalEventId: string }) => {
      const { error } = await supabase
        .from('gcal_event_links')
        .delete()
        .eq('id', params.linkId);

      if (error) throw error;
      return params.gcalEventId;
    },
    onSuccess: (gcalEventId) => {
      queryClient.invalidateQueries({ queryKey: ['gcal-links', gcalEventId] });
      toast.success('Usunięto powiązanie');
    },
    onError: (err: Error) => {
      toast.error(`Błąd: ${err.message}`);
    },
  });
}

// ─── Events linked to a specific CRM entity ────────────────────────
export function useLinkedEvents(linkedType: string, linkedId: string | undefined) {
  const { director } = useAuth();
  const tenantId = director?.tenant_id;

  return useQuery({
    queryKey: ['linked-events', linkedType, linkedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gcal_event_links')
        .select('id, gcal_event_id, gcal_calendar_id, created_at')
        .eq('tenant_id', tenantId!)
        .eq('linked_type', linkedType)
        .eq('linked_id', linkedId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && !!linkedId,
    staleTime: 2 * 60 * 1000,
  });
}
