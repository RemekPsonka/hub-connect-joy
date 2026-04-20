import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import type { SGUClientRow } from '@/hooks/useSGUClientsPortfolio';

interface Props {
  client: SGUClientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = {
  standard: 'Standard',
  ambassador: 'Ambasador',
  lost: 'Stracony',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

export function ClientDetailsDialog({ client, open, onOpenChange }: Props) {
  if (!client) return null;

  const status = client.client_status ?? 'standard';
  const totalForecasted = client.policies.reduce(
    (s, p) => s + Number(p.forecasted_premium ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client.full_name}</DialogTitle>
          {client.company && (
            <DialogDescription>{client.company}</DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Telefon</div>
            <div className="text-sm flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="hover:underline">
                  {client.phone}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">E-mail</div>
            <div className="text-sm flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {client.email ? (
                <a href={`mailto:${client.email}`} className="hover:underline truncate">
                  {client.email}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Status</div>
            <Badge variant="secondary">{STATUS_LABEL[status] ?? status}</Badge>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Suma składek (prognoza)</div>
            <div className="text-sm font-medium tabular-nums">
              {formatCompactCurrency(totalForecasted)}
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">
            Polisy ({client.policies.length})
          </div>
          {client.policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak polis</p>
          ) : (
            <div className="border rounded-md divide-y max-h-64 overflow-auto">
              {client.policies.map((p) => (
                <div key={p.id} className="p-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.policy_name ?? p.policy_type ?? 'Polisa'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.insurer_name ?? '—'} · do {fmtDate(p.end_date)}
                    </div>
                  </div>
                  <div className="text-sm tabular-nums shrink-0">
                    {formatCompactCurrency(Number(p.forecasted_premium ?? 0))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
