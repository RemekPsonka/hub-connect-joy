import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlag(flagName: string): boolean {
  const { data } = useQuery({
    queryKey: ['director-feature-flags'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};
      const { data, error } = await supabase
        .from('directors')
        .select('feature_flags')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return {};
      return ((data?.feature_flags as Record<string, boolean> | null) ?? {}) as Record<string, boolean>;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data?.[flagName] === true;
}
