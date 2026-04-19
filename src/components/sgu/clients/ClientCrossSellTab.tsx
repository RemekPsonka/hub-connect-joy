import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  rows: SGUClientRow[];
  teamId: string;
}

function hasLife(r: SGUClientRow): boolean {
  return r.policies.some((p) => {
    const t = (p.policy_type ?? '').toLowerCase();
    return t.includes('życ') || t.includes('zyc') || t.includes('life');
  });
}

function hasProperty(r: SGUClientRow): boolean {
  return r.policies.some((p) => {
    const t = (p.policy_type ?? '').toLowerCase();
    return t.includes('majątk') || t.includes('majatk') || t.includes('property') || t.includes('mieszk');
  });
}

export function ClientCrossSellTab({ rows, teamId }: Props) {
  const qc = useQueryClient();

  const sections = useMemo(() => {
    return {
      single: rows.filter((r) => r.policies.length === 1),
      noLife: rows.filter((r) => r.policies.length > 0 && !hasLife(r)),
      noProperty: rows.filter((r) => r.policies.length > 0 && !hasProperty(r)),
    };
  }, [rows]);

  const createTask = useMutation({
    mutationFn: async (r: SGUClientRow) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Brak użytkownika');
      const { data: dirData } = await supabase.from('directors').select('tenant_id').eq('user_id', userId).maybeSingle();
      const tenantId = dirData?.tenant_id;
      const due = new Date();
      due.setDate(due.getDate() + 7);
      const { error } = await supabase.from('tasks').insert({
        title: `Cross-sell rozmowa – ${r.full_name}`,
        due_date: due.toISOString().slice(0, 10),
        deal_team_id: teamId,
        deal_team_contact_id: r.id,
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
    },
    onError: (e) => toast.error('Błąd', { description: (e as Error).message }),
  });

  function renderSection(label: string, items: SGUClientRow[]) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{label}</span>
            <Badge variant="secondary">{items.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <p className="text-xs text-muted-foreground">Brak klientów</p>}
          {items.slice(0, 25).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded border">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.full_name}</div>
                {r.company && (
                  <div className="text-xs text-muted-foreground truncate">{r.company}</div>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => createTask.mutate(r)}
                disabled={createTask.isPending}
                className="gap-1 shrink-0"
              >
                <MessageSquarePlus className="h-3 w-3" /> Zadanie
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {renderSection('1 polisa tylko', sections.single)}
      {renderSection('Brakuje życia', sections.noLife)}
      {renderSection('Brakuje majątkowej', sections.noProperty)}
    </div>
  );
}
