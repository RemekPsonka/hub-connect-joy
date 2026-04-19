import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NeighborRow {
  contact_id: string;
  full_name: string;
  email: string | null;
  company: string | null;
  position: string | null;
  connection_id: string;
  strength: number;
  connection_type: string | null;
  relationship_type: string | null;
}

export interface NetworkPath {
  path_ids: string[];
  path_names: string[];
  hops: number;
  total_strength: number;
}

export function useContactNeighbors(contactId: string | null, minStrength = 0) {
  return useQuery({
    queryKey: ['contact-neighbors', contactId, minStrength],
    enabled: !!contactId,
    queryFn: async (): Promise<NeighborRow[]> => {
      if (!contactId) return [];
      const { data, error } = await supabase.rpc('rpc_contact_neighbors', {
        p_contact_id: contactId,
        p_min_strength: minStrength,
      });
      if (error) throw error;
      return (data ?? []) as NeighborRow[];
    },
  });
}

export function useNetworkPath(
  fromId: string | null,
  toId: string | null,
  maxHops = 3,
) {
  return useQuery({
    queryKey: ['network-path', fromId, toId, maxHops],
    enabled: !!fromId && !!toId && fromId !== toId,
    queryFn: async (): Promise<NetworkPath[]> => {
      if (!fromId || !toId) return [];
      const { data, error } = await supabase.rpc('rpc_network_paths', {
        p_from: fromId,
        p_to: toId,
        p_max_hops: maxHops,
      });
      if (error) throw error;
      return (data ?? []) as NetworkPath[];
    },
  });
}
