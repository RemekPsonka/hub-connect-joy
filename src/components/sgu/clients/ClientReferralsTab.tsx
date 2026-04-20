import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllClientReferrals } from '@/hooks/useClientReferrals';
import { AddReferralDialog } from './AddReferralDialog';
import { ConvertReferralDialog } from './ConvertReferralDialog';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';
import type { ClientReferralRow } from '@/hooks/useClientReferrals';

interface Props {
  rows: SGUClientRow[];
  teamId: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Oczekuje',
  added: 'Dodane do lejka',
  rejected: 'Odrzucone',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ClientReferralsTab({ rows, teamId }: Props) {
  const { data: referrals = [], isLoading } = useAllClientReferrals(teamId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<SGUClientRow | null>(null);
  const [convertItem, setConvertItem] = useState<ClientReferralRow | null>(null);

  const byReferrer = useMemo(() => {
    const map = new Map<string, ClientReferralRow[]>();
    for (const r of referrals) {
      const arr = map.get(r.referrer_deal_team_contact_id) ?? [];
      arr.push(r);
      map.set(r.referrer_deal_team_contact_id, arr);
    }
    return map;
  }, [referrals]);

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Brak klientów</div>;
  }

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-sm text-muted-foreground p-4">Ładowanie poleceń…</p>}
      {rows.map((client) => {
        const list = byReferrer.get(client.id) ?? [];
        const addedCount = list.filter((r) => r.status === 'added').length;
        const isAmbassador = addedCount >= 3;
        const isOpen = openId === client.id;

        return (
          <Collapsible key={client.id} open={isOpen} onOpenChange={(o) => setOpenId(o ? client.id : null)}>
            <Card>
              <div className="flex items-center gap-2 p-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{client.full_name}</div>
                  {client.company && (
                    <div className="text-xs text-muted-foreground truncate">{client.company}</div>
                  )}
                </div>
                {isAmbassador && (
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">
                    🏆 Ambasador
                  </Badge>
                )}
                <Badge variant="outline">{list.length} pol.</Badge>
                <Button size="sm" variant="outline" onClick={() => setAddFor(client)} className="gap-1">
                  <Plus className="h-3 w-3" /> Dodaj
                </Button>
              </div>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Brak poleceń od tego klienta</p>
                  ) : (
                    <div className="space-y-2">
                      {list.map((ref) => (
                        <div key={ref.id} className="flex items-center gap-2 p-2 rounded border text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{ref.referred_name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[ref.referred_phone, ref.referred_email].filter(Boolean).join(' · ') || '—'}
                            </div>
                            {ref.notes && (
                              <div className="text-xs text-muted-foreground italic mt-0.5">{ref.notes}</div>
                            )}
                          </div>
                          <Badge variant={ref.status === 'added' ? 'default' : 'outline'} className="text-[10px]">
                            {STATUS_LABEL[ref.status] ?? ref.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{fmtDate(ref.created_at)}</span>
                          {ref.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => setConvertItem(ref)} className="gap-1">
                              <ArrowRight className="h-3 w-3" /> Konwertuj
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {addFor && (
        <AddReferralDialog
          open={!!addFor}
          onOpenChange={(o) => !o && setAddFor(null)}
          referrerId={addFor.id}
          referrerName={addFor.full_name}
        />
      )}
      {convertItem && (
        <ConvertReferralDialog
          open={!!convertItem}
          onOpenChange={(o) => !o && setConvertItem(null)}
          referral={convertItem}
          teamId={teamId}
        />
      )}
    </div>
  );
}
