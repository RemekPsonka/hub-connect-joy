import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BugReport {
  id: string;
  tenant_id: string;
  reporter_user_id: string | null;
  reporter_name: string | null;
  title: string;
  description: string;
  page_url: string | null;
  screenshot_url: string | null;
  context_data: Record<string, unknown> | null;
  status: 'new' | 'in_progress' | 'testing' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export interface BugReportsFilters {
  status?: string;
  priority?: string;
}

export function useBugReports(filters?: BugReportsFilters) {
  return useQuery({
    queryKey: ['bug-reports', filters],
    queryFn: async () => {
      let query = supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BugReport[];
    },
  });
}

export function useBugReportsCount() {
  return useQuery({
    queryKey: ['bug-reports-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bug_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'in_progress']);

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateBugReport() {
  const queryClient = useQueryClient();
  const { director, assistant, user } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      priority: string;
      screenshotBlob?: Blob;
      pageUrl?: string;
      contextData?: Record<string, unknown>;
    }) => {
      if (!tenantId) throw new Error('Brak tenant_id');

      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (data.screenshotBlob) {
        const filename = `${tenantId}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('bug-screenshots')
          .upload(filename, data.screenshotBlob, {
            contentType: 'image/png',
          });

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('bug-screenshots')
            .getPublicUrl(filename);
          screenshotUrl = urlData.publicUrl;
        }
      }

      const { data: report, error } = await supabase
        .from('bug_reports')
        .insert({
          tenant_id: tenantId,
          reporter_user_id: user?.id,
          reporter_name: director?.name || assistant?.name || 'Unknown',
          title: data.title,
          description: data.description,
          priority: data.priority,
          page_url: data.pageUrl,
          screenshot_url: screenshotUrl,
          context_data: data.contextData,
          status: 'new',
        })
        .select()
        .single();

      if (error) throw error;
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports-count'] });
      toast.success('Zgłoszenie dodane do kolejki');
    },
    onError: (error) => {
      console.error('Error creating bug report:', error);
      toast.error('Nie udało się utworzyć zgłoszenia');
    },
  });
}

export function useUpdateBugReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      resolutionNotes,
    }: {
      id: string;
      status: string;
      resolutionNotes?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }

      const { data, error } = await supabase
        .from('bug_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports-count'] });
    },
    onError: (error) => {
      console.error('Error updating bug report:', error);
      toast.error('Nie udało się zaktualizować zgłoszenia');
    },
  });
}

export function useDeleteBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports-count'] });
      toast.success('Zgłoszenie usunięte');
    },
    onError: (error) => {
      console.error('Error deleting bug report:', error);
      toast.error('Nie udało się usunąć zgłoszenia');
    },
  });
}
