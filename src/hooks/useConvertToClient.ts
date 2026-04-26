import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Sprint S2 — UNIFY-CONVERT-CLIENT.
 * Jedyny hook do konwersji prospekt → klient. Wywołuje RPC `convert_to_client`,
 * które atomowo ustawia category='client', won_at, offering_stage='won',
 * synchronizuje client_complexity (4 boolean flagi) i 4 bigint potencjały
 * (PLN × 100) oraz expected_annual_premium_gr (suma).
 *
 * Walidacja "min. 1 obszar" jest zarówno w RPC (RAISE EXCEPTION P0001),
 * jak i w UI (disable submit).
 */
export type ConvertAreaInput = {
  active: boolean;
  annualPremiumPln?: number;
};

export type ConvertToClientAreas = {
  property?: ConvertAreaInput;
  financial?: ConvertAreaInput;
  communication?: ConvertAreaInput;
  life_group?: ConvertAreaInput;
};

export type ConvertToClientInput = {
  dealTeamContactId: string;
  areas: ConvertToClientAreas;
};

export function useConvertToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConvertToClientInput) => {
      const { error } = await supabase.rpc('convert_to_client', {
        p_dtc_id: input.dealTeamContactId,
        // RPC oczekuje jsonb — wąsko rzutowane do typu generowanego przez Supabase types.
        p_areas: input.areas as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deal-team-contacts'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      qc.invalidateQueries({ queryKey: ['sgu-clients-portfolio'] });
      qc.invalidateQueries({ queryKey: ['unified-kanban-data'] });
      qc.invalidateQueries({ queryKey: ['active-task-contacts'] });
    },
  });
}
