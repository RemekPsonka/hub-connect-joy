import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, MessageSquare } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import type { OdprawaAgendaItem } from '@/hooks/sgu/useOdprawaAgenda';

interface Props {
  item: OdprawaAgendaItem;
  isCovered: boolean;
  onMarkCovered: (id: string) => void;
  onOpenDetails?: (id: string) => void;
}

function formatRelative(dateIso: string | null): string {
  if (!dateIso) return '—';
  const d = new Date(dateIso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  if (days < 30) return `${Math.floor(days / 7)} tyg. temu`;
  return d.toLocaleDateString('pl-PL');
}

export function AgendaItemCard({ item, isCovered, onMarkCovered, onOpenDetails }: Props) {
  return (
    <Card
      className={`p-4 transition-all hover:shadow-md ${
        isCovered ? 'opacity-60 bg-muted/30' : 'bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <PriorityBadge bucket={item.priority_bucket} />
            {item.offering_stage && (
              <Badge variant="secondary" className="text-xs">
                {item.offering_stage}
              </Badge>
            )}
            {item.open_questions_count > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                {item.open_questions_count}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenDetails?.(item.deal_team_contact_id)}
            className="text-left w-full"
          >
            <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">
              {item.contact_name ?? 'Bez nazwy'}
            </h3>
            {item.company_name && (
              <p className="text-sm text-muted-foreground truncate">{item.company_name}</p>
            )}
          </button>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(item.last_status_update)}
            </span>
            {item.is_stalled && (
              <span className="text-destructive font-medium">zalega</span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={isCovered ? 'secondary' : 'default'}
          onClick={() => onMarkCovered(item.deal_team_contact_id)}
          className="shrink-0"
        >
          <Check className="h-4 w-4 mr-1" />
          {isCovered ? 'Omówiony' : 'Omów'}
        </Button>
      </div>
    </Card>
  );
}