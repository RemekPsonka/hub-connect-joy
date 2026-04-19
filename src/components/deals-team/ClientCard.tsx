import { useMemo } from 'react';
import { UserCheck } from 'lucide-react';
import { useClientProducts } from '@/hooks/useTeamClients';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { DealTeamContact } from '@/types/dealTeam';
import { useSGUContactDisplay } from '@/hooks/useSGUContactDisplay';
import { useLayoutMode } from '@/store/layoutMode';
import { PremiumProgress } from '@/components/sgu/PremiumProgress';

interface ClientCardProps {
  client: DealTeamContact;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const { data: products = [] } = useClientProducts(client.id);
  const display = useSGUContactDisplay(client);
  const { mode } = useLayoutMode();
  const isSguMode = mode === 'sgu';

  const totals = useMemo(() => {
    const value = products.reduce((s, p) => s + p.deal_value, 0);
    const commission = products.reduce((s, p) => s + p.expected_commission, 0);
    return { value, commission };
  }, [products]);

  return (
    <Card
      className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">{display.fullName ?? '—'}</p>
              {display.isSguRef && (
                <Badge variant="secondary" className="h-4 px-1 text-[9px] shrink-0">Z CRM</Badge>
              )}
            </div>
            {display.company && (
              <p className="text-xs text-muted-foreground truncate">{display.company}</p>
            )}
            {client.contact?.position && (
              <p className="text-xs text-muted-foreground truncate">{client.contact.position}</p>
            )}
          </div>
        </div>

        {/* Products summary */}
        {products.length > 0 && (
          <div className="mt-3 space-y-1">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.category_color || '#6366f1' }} />
                <span className="flex-1 truncate">{p.category_name}</span>
                <span className="font-medium">{formatCompactCurrency(p.deal_value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs pt-1 border-t mt-1">
              <span className="text-muted-foreground">Razem</span>
              <span className="font-semibold">{formatCompactCurrency(totals.value)}</span>
            </div>
            {totals.commission > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Prowizja</span>
                <span className="text-emerald-600 font-medium">{formatCompactCurrency(totals.commission)}</span>
              </div>
            )}
          </div>
        )}

        {/* SGU mode: premium progress (oczekiwany / wystawiony / opłacony) */}
        {isSguMode && (
          <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
            <PremiumProgress dealTeamContactId={client.id} compact />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
