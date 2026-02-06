import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DealTeamContact } from '@/types/dealTeam';

interface HotLeadCardProps {
  contact: DealTeamContact;
  teamId: string;
}

export function HotLeadCard({ contact, teamId }: HotLeadCardProps) {
  return (
    <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        {/* Row 1: Name + status */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/contacts/${contact.contact_id}`}
              className="font-medium hover:underline text-sm block truncate"
            >
              {contact.contact?.full_name || 'Nieznany kontakt'}
            </Link>
            {contact.contact?.company && (
              <p className="text-xs text-muted-foreground truncate">
                {contact.contact.company}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              variant={contact.status === 'active' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {contact.status === 'active' ? 'Aktywny' : contact.status}
            </Badge>
            <div
              className={`w-2 h-2 rounded-full ${
                contact.status_overdue ? 'bg-destructive' : 'bg-primary'
              }`}
              title={contact.status_overdue ? 'Status nieaktualny' : 'Status aktualny'}
            />
          </div>
        </div>

        {/* Row 2: Next meeting */}
        {contact.next_meeting_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(contact.next_meeting_date), 'dd MMM', { locale: pl })}
            </span>
            {contact.next_meeting_with && (
              <span className="truncate">z {contact.next_meeting_with}</span>
            )}
          </div>
        )}

        {/* Row 3: Next action */}
        {contact.next_action && (
          <div className="text-xs bg-muted rounded p-1.5">
            <span className="font-medium">→ </span>
            <span className="truncate">{contact.next_action}</span>
            {contact.next_action_date && (
              <span className="text-muted-foreground ml-1">
                (do {format(new Date(contact.next_action_date), 'dd.MM')})
              </span>
            )}
          </div>
        )}

        {/* Row 4: Estimated value */}
        {contact.estimated_value && contact.estimated_value > 0 && (
          <div className="text-xs font-medium text-primary">
            {contact.estimated_value.toLocaleString('pl-PL')} {contact.value_currency}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
