import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Director {
  id: string;
  user_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

// Fetch all directors in the same tenant
export function useDirectors() {
  return useQuery({
    queryKey: ['directors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('directors')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Director[];
    },
  });
}

// Fetch current director
export function useCurrentDirector() {
  return useQuery({
    queryKey: ['current-director'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('directors')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Director;
    },
  });
}
