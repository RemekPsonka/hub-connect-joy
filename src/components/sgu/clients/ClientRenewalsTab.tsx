import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarPlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  rows: SGUClientRow[];
  teamId: string;
  filter?: string | null;
}

interface RenewalItem {
  policyId: string;
  clientName: string;
  clientId: string;
  policyType: string | null;
  policyName: string | null;
  endDate: string;
  forecasted: number;
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function ClientRenewalsTab({ rows, teamId, filter }: Props) {
  const qc = useQueryClient();
  const maxDays = filter === 'lt14' ? 14 : 90;

  const filteredRows = useMemo(() => {
    if (filter === 'near_ambassador') {
      return rows.filter(
        (r) => (r.client_status ?? 'standard') === 'standard' && r.policies.length >= 2,
      );
    }
    return rows;
  }, [rows, filter]);

  const groups = useMemo(() => {
    const g30: RenewalItem[] = [];
    const g60: RenewalItem[] = [];
    const g90: RenewalItem[] = [];
    for (const r of filteredRows) {
      for (const p of r.policies) {
        if (!p.end_date) continue;
        const d = daysUntil(p.end_date);
        if (d < 0 || d > maxDays) continue;
        const item: RenewalItem = {
          policyId: p.id,
          clientName: r.full_name,
          clientId: r.id,
          policyType: p.policy_type,
          policyName: p.policy_name,
          endDate: p.end_date,
          forecasted: Number(p.forecasted_premium ?? 0),
        };
        if (d <= 30) g30.push(item);
        else if (d <= 60) g60.push(item);
        else g90.push(item);
      }
    }
    const sortFn = (a: RenewalItem, b: RenewalItem) => a.endDate.localeCompare(b.endDate);
    return { g30: g30.sort(sortFn), g60: g60.sort(sortFn), g90: g90.sort(sortFn) };
  }, [filteredRows, maxDays]);

  const createTask = useMutation({
    mutationFn: async (item: RenewalItem) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');
      const { data: dirData } = await supabase.from('directors').select('tenant_id').eq('user_id', userId).maybeSingle();
      const tenantId = dirData?.tenant_id;
      if (!tenantId) throw new Error('Brak tenant_id');

      const due = new Date(item.endDate);
      due.setDate(due.getDate() - 14);
      const dueStr = due.toISOString().slice(0, 10);

      const { error } = await supabase.from('tasks').insert({
        title: `Odnowienie polisy ${item.policyName ?? item.policyType ?? ''} – ${item.clientName}`.trim(),
        due_date: dueStr,
        deal_team_id: teamId,
        deal_team_contact_id: item.clientId,
        owner_id: userId,
        assigned_to_user_id: userId,
        tenant_id: tenantId,
        task_type: 'renewal',
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Zadanie utworzone');
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e) => toast.error('Błąd', { description: (e as Error).message }),
  });

  function renderGroup(label: string, items: RenewalItem[]) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{label}</span>
            <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">Brak odnowień</p>}
          {items.map((it) => (
            <div key={it.policyId} className="flex items-center justify-between gap-2 p-2 rounded border">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{it.clientName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {it.policyType ?? 'polisa'} · {fmtDate(it.endDate)} · {formatCompactCurrency(it.forecasted)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createTask.mutate(it)}
                disabled={createTask.isPending}
                className="gap-1 shrink-0"
              >
                <CalendarPlus className="h-3 w-3" /> Przygotuj
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {renderGroup('30 dni', groups.g30)}
      {renderGroup('60 dni', groups.g60)}
      {renderGroup('90 dni', groups.g90)}
    </div>
  );
}
