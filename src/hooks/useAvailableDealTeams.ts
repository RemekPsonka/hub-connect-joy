import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableDealTeam {
  id: string;
  name: string;
  is_sgu: boolean;
}

/**
 * Lejki sprzedaży, do których zalogowany użytkownik (dyrektor) może wrzucać kontakty.
 * RLS na deal_teams + filtr is_active=true. Flaga is_sgu = match po nazwie 'SGU'
 * (wystarczy do nawigacji post-push: SGU → /sgu/sprzedaz, reszta → /deals-team).
 */
export function useAvailableDealTeams() {
  const { data, isLoading } = useQuery({
    queryKey: ['available-deal-teams'],
    queryFn: async (): Promise<AvailableDealTeam[]> => {
      const { data, error } = await supabase
        .from('deal_teams')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id as string,
        name: t.name as string,
        is_sgu: (t.name as string).trim().toUpperCase() === 'SGU',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    teams: data ?? [],
    isLoading,
  };
}
