import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GmailThreadRow {
  id: string;
  gmail_thread_id: string;
  subject: string | null;
  snippet: string | null;
  last_message_at: string | null;
  message_count: number;
  contact_id: string | null;
  label_ids: string[] | null;
  is_unread: boolean;
}

export interface ThreadFilters {
  labelId?: string;
  unreadOnly?: boolean;
  search?: string;
  contactId?: string;
}

export function useGmailThreads(filters: ThreadFilters = {}) {
  return useQuery({
    queryKey: ['gmail-threads', filters],
    queryFn: async () => {
      let q = supabase
        .from('gmail_threads')
        .select('id, gmail_thread_id, subject, snippet, last_message_at, message_count, contact_id, label_ids, is_unread')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (filters.labelId) q = q.contains('label_ids', [filters.labelId]);
      if (filters.unreadOnly) q = q.eq('is_unread', true);
      if (filters.contactId) q = q.eq('contact_id', filters.contactId);
      if (filters.search && filters.search.trim()) {
        q = q.ilike('subject', `%${filters.search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GmailThreadRow[];
    },
  });
}

export interface GmailMessageRow {
  id: string;
  gmail_message_id: string;
  thread_id: string;
  from: string | null;
  to: string | null;
  cc: string | null;
  subject: string | null;
  body_plain: string | null;
  body_html: string | null;
  date: string | null;
  labels: string[] | null;
}

export function useGmailThread(threadId?: string) {
  return useQuery({
    queryKey: ['gmail-thread', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmail_messages')
        .select('id, gmail_message_id, thread_id, "from", "to", cc, subject, body_plain, body_html, date, labels')
        .eq('thread_id', threadId!)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as GmailMessageRow[];
    },
  });
}

export interface GmailLabelRow {
  id: string;
  gmail_label_id: string;
  name: string;
  type: string | null;
  color: { backgroundColor?: string; textColor?: string } | null;
}

export function useGmailLabels() {
  return useQuery({
    queryKey: ['gmail-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmail_labels')
        .select('id, gmail_label_id, name, type, color')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as GmailLabelRow[];
    },
  });
}

export function useGmailThreadsByContact(contactId?: string) {
  return useQuery({
    queryKey: ['gmail-threads-by-contact', contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmail_threads')
        .select('id, gmail_thread_id, subject, snippet, last_message_at, message_count, contact_id, label_ids, is_unread')
        .eq('contact_id', contactId!)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as GmailThreadRow[];
    },
  });
}
