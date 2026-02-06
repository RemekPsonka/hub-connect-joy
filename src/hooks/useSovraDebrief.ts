import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────
export interface DebriefActionItem {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggested_deadline: string | null;
  suggested_assignee_hint: string;
}

export interface DebriefFollowUp {
  contact_name: string;
  action: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface DebriefResult {
  session_id: string | null;
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: DebriefActionItem[];
  follow_ups: DebriefFollowUp[];
  meeting_sentiment: 'positive' | 'neutral' | 'negative';
  next_meeting_suggested: boolean;
  raw_note_cleaned: string;
  note_saved: boolean;
  note_id: string | null;
}

interface RunDebriefParams {
  raw_text: string;
  gcal_event_id?: string;
  gcal_calendar_id?: string;
  project_id?: string;
  contact_ids?: string[];
}

// ─── Hook: useRunDebrief ─────────────────────────────────────────────
export function useRunDebrief() {
  return useMutation({
    mutationFn: async (params: RunDebriefParams): Promise<DebriefResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesja wygasła');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sovra-debrief`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(params),
      });

      if (response.status === 429) {
        throw new Error('Limit debriefów — max 10 na godzinę. Spróbuj za chwilę.');
      }
      if (response.status === 402) {
        throw new Error('Wymagana płatność — doładuj kredyty AI.');
      }
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Błąd analizy debriefu');
      }

      return response.json();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Hook: useCreateDebriefTasks ─────────────────────────────────────
export function useCreateDebriefTasks() {
  const { director } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      projectId,
      sessionId,
    }: {
      items: DebriefActionItem[];
      projectId?: string;
      sessionId?: string | null;
    }) => {
      if (!director) throw new Error('Brak dyrektora');

      // Get tenant_id from director
      const { data: dirRow } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('id', director.id)
        .single();

      if (!dirRow) throw new Error('Nie znaleziono danych dyrektora');

      const tasks = items.map((item) => ({
        tenant_id: dirRow.tenant_id,
        title: item.title,
        description: item.description,
        priority: item.priority === 'critical' ? 'high' : item.priority,
        due_date: item.suggested_deadline || null,
        project_id: projectId || null,
        assigned_to: director.id,
        owner_id: director.id,
        status: 'pending' as const,
      }));

      const { error } = await supabase.from('tasks').insert(tasks);
      if (error) throw error;

      // Update tasks_created count on session
      if (sessionId) {
        await supabase
          .from('sovra_sessions')
          .update({ tasks_created: items.length })
          .eq('id', sessionId);
      }

      return items.length;
    },
    onSuccess: (count) => {
      toast.success(`Utworzono ${count} ${count === 1 ? 'zadanie' : count < 5 ? 'zadania' : 'zadań'}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sovra-sessions'] });
    },
    onError: (err: Error) => {
      toast.error(`Błąd tworzenia zadań: ${err.message}`);
    },
  });
}

// ─── Hook: useCreateFollowUpReminder ─────────────────────────────────
export function useCreateFollowUpReminder() {
  const { director } = useAuth();

  return useMutation({
    mutationFn: async (followUp: DebriefFollowUp) => {
      if (!director) throw new Error('Brak dyrektora');

      const { data: dirRow } = await supabase
        .from('directors')
        .select('tenant_id')
        .eq('id', director.id)
        .single();

      if (!dirRow) throw new Error('Nie znaleziono danych dyrektora');

      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);

      const { error } = await supabase.from('sovra_reminders').insert({
        tenant_id: dirRow.tenant_id,
        director_id: director.id,
        type: 'follow_up',
        message: `Follow-up z ${followUp.contact_name}: ${followUp.action}`,
        scheduled_at: scheduledAt.toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reminder utworzony na jutro');
    },
    onError: (err: Error) => {
      toast.error(`Błąd tworzenia remindra: ${err.message}`);
    },
  });
}
