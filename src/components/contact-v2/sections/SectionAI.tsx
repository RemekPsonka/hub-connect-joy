import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionShell } from './SectionShell';

interface Props {
  contactId: string;
  enabled: boolean;
}

export function SectionAI({ contactId, enabled }: Props) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['contact-v2-section', 'ai', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_ai_cache')
        .select('summary_json, tldr, generated_at, model')
        .eq('contact_id', contactId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sovra-contact-tldr', {
        body: { contact_id: contactId, force_refresh: true },
      });
      console.log('[tldr-refresh]', { data, error, contact_id: contactId });
      if (error) throw error;
      toast.success('Cache AI odświeżony');
      qc.invalidateQueries({ queryKey: ['contact-v2-section', 'ai', contactId] });
      qc.invalidateQueries({ queryKey: ['contact-tldr', contactId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Nie udało się odświeżyć');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SectionShell
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      refetch={query.refetch}
      isEmpty={!query.data}
      emptyMessage="Cache AI jeszcze nie zbudowany"
    >
      {query.data && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Wygenerowano:{' '}
              {query.data.generated_at && new Date(query.data.generated_at).toLocaleString('pl-PL')}
              {query.data.model && <> · {query.data.model}</>}
            </span>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Odśwież cache
            </Button>
          </div>
          {query.data.tldr && (
            <div className="rounded border bg-muted/30 px-3 py-2 text-sm">{query.data.tldr}</div>
          )}
          <pre className="text-xs overflow-auto max-h-96 bg-muted p-3 rounded">
            {JSON.stringify(query.data.summary_json, null, 2)}
          </pre>
        </div>
      )}
    </SectionShell>
  );
}
