import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquarePlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { getClientComplexity } from '@/hooks/useClientComplexity';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  client: SGUClientRow;
  teamId: string;
}

export function ClientComplexityPanel({ client, teamId }: Props) {
  const qc = useQueryClient();
  const result = getClientComplexity(client);

  const createTask = useMutation({
    mutationFn: async (areaLabel: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');
      const { data: dirData } = await supabase.from('directors').select('tenant_id').eq('user_id', userId).maybeSingle();
      const tenantId = dirData?.tenant_id;
      if (!tenantId) throw new Error('Brak tenant_id');
      const due = new Date();
      due.setDate(due.getDate() + 7);
      const { error } = await supabase.from('tasks').insert({
        title: `Cross-sell ${areaLabel} – ${client.full_name}`,
        due_date: due.toISOString().slice(0, 10),
        deal_team_id: teamId,
        deal_team_contact_id: client.id,
        owner_id: userId,
        assigned_to_user_id: userId,
        tenant_id: tenantId,
        task_type: 'cross_sell',
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zadanie utworzone');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['sgu-tasks'] });
    },
    onError: (e: Error) => toast.error('Błąd', { description: e.message }),
  });

  const pct = Math.round((result.greenCount / result.totalAreas) * 100);

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium">{result.greenCount}/{result.totalAreas} obszarów aktywnych</span>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {result.areas.map((a) => (
          <Card key={a.key} className={cn('p-3 flex items-center gap-3', a.active ? 'border-emerald-500/40 bg-emerald-500/5' : 'opacity-70')}>
            <div className={cn('text-2xl', a.active ? '' : 'grayscale')}>{a.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{a.label}</div>
              <div className="text-xs text-muted-foreground">
                {a.active ? 'Aktywny' : 'Brak'}
                {typeof a.potentialGr === 'number' && a.potentialGr > 0 && (
                  <> · pot. {formatCompactCurrency(a.potentialGr / 100)}</>
                )}
                {typeof a.count === 'number' && a.count > 0 && <> · {a.count}</>}
              </div>
            </div>
            {!a.active && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => createTask.mutate(a.label)}
                disabled={createTask.isPending}
                className="gap-1 shrink-0"
              >
                <MessageSquarePlus className="h-3 w-3" />
                Task
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
