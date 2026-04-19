import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SGUAccess {
  hasAccess: boolean;
  isPartner: boolean;
  isRep: boolean;
}

export function useSGUAccess() {
  const { data, isLoading } = useQuery<SGUAccess>({
    queryKey: ['sgu-access'],
    queryFn: async () => {
      const [access, partner, rep] = await Promise.all([
        supabase.rpc('has_sgu_access'),
        supabase.rpc('is_sgu_partner'),
        supabase.rpc('is_sgu_representative'),
      ]);
      return {
        hasAccess: !!access.data,
        isPartner: !!partner.data,
        isRep: !!rep.data,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasAccess: data?.hasAccess ?? false,
    isPartner: data?.isPartner ?? false,
    isRep: data?.isRep ?? false,
    isLoading,
  };
}
