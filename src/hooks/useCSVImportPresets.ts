import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CSVImportPreset {
  id: string;
  name: string;
  column_mapping: Record<string, string>;
  description: string | null;
  last_used_at: string | null;
  usage_count: number;
}

export function useCSVImportPresets() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['sgu-csv-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sgu_csv_import_presets')
        .select('id, name, column_mapping, description, last_used_at, usage_count')
        .order('last_used_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as CSVImportPreset[];
    },
    staleTime: 60_000,
  });

  const touchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sgu_csv_import_presets')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sgu-csv-presets'] }),
  });

  return { ...list, touchPreset: touchMutation.mutateAsync };
}
