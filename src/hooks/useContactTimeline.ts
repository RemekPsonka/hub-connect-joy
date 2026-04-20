import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TimelineItem = {
  kind: 'note' | 'email' | 'meeting' | 'ai_signal' | 'task' | 'deal_change';
  id: string;
  ts: string;
  title: string;
  preview: string;
  author: string;
  meta?: Record<string, unknown>;
};

export function useContactTimeline(contactId: string, filter: string = 'all') {
  return useInfiniteQuery({
    queryKey: ['contact-timeline', contactId, filter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.functions.invoke('sovra-contact-activity-timeline', {
        body: { contact_id: contactId, filter, limit: 30, before: pageParam },
      });
      if (error) throw error;
      return data as { items: TimelineItem[]; has_more: boolean };
    },
    getNextPageParam: (last) =>
      last.has_more && last.items.length > 0 ? last.items[last.items.length - 1].ts : undefined,
    enabled: !!contactId,
  });
}
