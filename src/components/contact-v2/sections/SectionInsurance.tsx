import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { SectionShell } from './SectionShell';

interface Props {
  companyId: string | null;
  enabled: boolean;
}

export function SectionInsurance({ companyId, enabled }: Props) {
  const query = useQuery({
    queryKey: ['contact-v2-section', 'insurance', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('id, policy_type, policy_number, end_date, premium, workflow_status')
        .eq('company_id', companyId)
        .order('end_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: enabled && !!companyId,
  });

  return (
    <SectionShell
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      refetch={query.refetch}
      isEmpty={!query.data || query.data.length === 0}
      emptyMessage={!companyId ? 'Brak firmy — nie można pobrać polis' : 'Brak polis powiązanych z firmą'}
    >
      <div className="divide-y">
        {query.data?.map((p) => (
          <div key={p.id} className="py-2 text-sm flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">
                {p.policy_type ?? 'Polisa'} {p.policy_number && <span className="text-muted-foreground">· {p.policy_number}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {p.end_date && <>Do: {new Date(p.end_date).toLocaleDateString('pl-PL')} · </>}
                {p.premium && <>Składka: {Number(p.premium).toLocaleString('pl-PL')} zł</>}
              </div>
            </div>
            {p.workflow_status && <Badge variant="outline">{p.workflow_status}</Badge>}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
