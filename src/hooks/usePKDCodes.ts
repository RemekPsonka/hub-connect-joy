import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PKDCode {
  code: string;
  name: string;
  sector: string | null;
}

/** Search PKD codes by free-text input (matches code or name). */
export function usePKDCodes(search: string) {
  return useQuery({
    queryKey: ['pkd-codes-seed', search],
    queryFn: async (): Promise<PKDCode[]> => {
      let q = supabase
        .from('pkd_codes_seed')
        .select('code, name, sector')
        .order('code', { ascending: true })
        .limit(50);

      const term = search.trim();
      if (term.length > 0) {
        // Match either code prefix or name ilike
        q = q.or(`code.ilike.${term}%,name.ilike.%${term}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PKDCode[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
