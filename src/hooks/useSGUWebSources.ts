import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SGUWebSource {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  source_type: 'rss' | 'html' | 'api';
  parser_config: Record<string, unknown>;
  search_keywords: string[] | null;
  active: boolean;
  last_scraped_at: string | null;
  last_result_count: number | null;
  last_error: string | null;
  scrape_interval_hours: number;
  created_at: string;
  updated_at: string;
}

export interface WebSourceInput {
  name: string;
  url: string;
  source_type: 'rss' | 'html' | 'api';
  search_keywords: string[];
  parser_config?: Record<string, unknown>;
  active?: boolean;
  scrape_interval_hours?: number;
}

export function useSGUWebSources() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['sgu-web-sources'],
    queryFn: async (): Promise<SGUWebSource[]> => {
      const { data, error } = await supabase
        .from('sgu_web_sources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SGUWebSource[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: WebSourceInput) => {
      const { data: tenantId } = await supabase.rpc('get_current_tenant_id');
      if (!tenantId) throw new Error('Brak tenant_id');
      const { data: userRes } = await supabase.auth.getUser();

      const { data, error } = await supabase.from('sgu_web_sources').insert({
        tenant_id: tenantId,
        name: input.name,
        url: input.url,
        source_type: input.source_type,
        search_keywords: input.search_keywords,
        parser_config: input.parser_config ?? {},
        active: input.active ?? true,
        scrape_interval_hours: input.scrape_interval_hours ?? 6,
        created_by_user_id: userRes.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Źródło dodane');
      qc.invalidateQueries({ queryKey: ['sgu-web-sources'] });
    },
    onError: (e: Error) => toast.error('Błąd: ' + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WebSourceInput> & { id: string }) => {
      const { error } = await supabase.from('sgu_web_sources').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zaktualizowano');
      qc.invalidateQueries({ queryKey: ['sgu-web-sources'] });
    },
    onError: (e: Error) => toast.error('Błąd: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sgu_web_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Usunięto');
      qc.invalidateQueries({ queryKey: ['sgu-web-sources'] });
    },
    onError: (e: Error) => toast.error('Błąd: ' + e.message),
  });

  const triggerNowMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke('sgu-prospecting-web', {
        body: { source_id: sourceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Job uruchomiony: ${data?.source_name ?? ''}. Wynik za 1-3 min.`);
      qc.invalidateQueries({ queryKey: ['sgu-web-sources'] });
      qc.invalidateQueries({ queryKey: ['sgu-prospecting-jobs'] });
    },
    onError: (e: Error) => toast.error('Nie udało się uruchomić: ' + e.message),
  });

  return { ...query, createMutation, updateMutation, deleteMutation, triggerNowMutation };
}
