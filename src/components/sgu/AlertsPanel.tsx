import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, PhoneOff } from 'lucide-react';
import { useSGUAlerts } from '@/hooks/useSGUAlerts';
import { Skeleton } from '@/components/ui/skeleton';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pl-PL');
const formatPLN = (n: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(n);

export function AlertsPanel() {
  const { data, isLoading } = useSGUAlerts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const expiring = data?.expiringPolicies ?? [];
  const overdue = data?.overdueInstallments ?? [];
  const cold = data?.coldContacts ?? [];

  return (
    <Accordion type="multiple" defaultValue={['expiring', 'overdue']} className="w-full">
      <AccordionItem value="expiring">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            <span className="font-medium">Polisy kończące się (≤14 dni)</span>
            <Badge variant={expiring.length > 0 ? 'default' : 'secondary'}>{expiring.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Brak polis wygasających w najbliższych 14 dniach.</p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {expiring.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="truncate">Polisa {p.id.slice(0, 8)}…</span>
                  <span className="text-muted-foreground tabular-nums">{formatDate(p.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="overdue">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-medium">Raty zaległe</span>
            <Badge variant={overdue.length > 0 ? 'destructive' : 'secondary'}>{overdue.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Brak zaległych rat.</p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {overdue.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="truncate">Termin: {formatDate(r.scheduled_date)}</span>
                  <span className="font-medium tabular-nums">{formatPLN(Number(r.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cold">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <PhoneOff className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Klienci bez kontaktu (&gt;30 dni)</span>
            <Badge variant="secondary">{cold.length}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {cold.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Wszyscy klienci są w kontakcie.</p>
          ) : (
            <ul className="space-y-1.5 py-1">
              {cold.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="truncate">Kontakt {c.contact_id?.slice(0, 8) ?? '—'}…</span>
                  <span className="text-muted-foreground tabular-nums">ostatnio: {formatDate(c.updated_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
