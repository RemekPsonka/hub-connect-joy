import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Building2, CalendarDays, DollarSign, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCompactCurrency } from '@/lib/formatCurrency';
import type { DealTeamContact } from '@/types/dealTeam';
import type { PaymentScheduleEntry } from '@/hooks/usePaymentSchedule';

interface OfferingKanbanCardProps {
  contact: DealTeamContact;
  payments: PaymentScheduleEntry[];
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

export function OfferingKanbanCard({ contact, payments, onClick, onDragStart }: OfferingKanbanCardProps) {
  const totalValue = payments.reduce((s, p) => s + p.amount, 0);
  const nextPayment = payments.find(p => !p.is_paid);
  const paidCount = payments.filter(p => p.is_paid).length;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 mt-0.5 shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{contact.contact?.full_name || '—'}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <Building2 className="h-3 w-3 shrink-0" />
            {contact.contact?.company || '—'}
          </p>
        </div>
      </div>

      {totalValue > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="font-semibold">{formatCompactCurrency(totalValue)}</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {paidCount}/{payments.length}
          </Badge>
        </div>
      )}

      {nextPayment && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {format(parseISO(nextPayment.scheduled_date), 'd MMM', { locale: pl })}
          <span className="ml-auto font-medium text-foreground">
            {formatCompactCurrency(nextPayment.amount)}
          </span>
        </div>
      )}
    </div>
  );
}
