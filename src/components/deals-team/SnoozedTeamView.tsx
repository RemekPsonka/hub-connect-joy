import { useMemo } from 'react';
import { format, isPast, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Moon, AlarmClock, Building2 } from 'lucide-react';
import { useTeamContacts, useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DealTeamContact } from '@/types/dealTeam';

const categoryLabels: Record<string, { label: string; icon: string }> = {
  hot: { label: 'HOT', icon: '🔥' },
  top: { label: 'TOP', icon: '⭐' },
  lead: { label: 'LEAD', icon: '📋' },
  cold: { label: 'COLD', icon: '❄️' },
  offering: { label: 'OFERTOWANIE', icon: '📝' },
};

interface SnoozedTeamViewProps {
  teamId: string;
}

export function SnoozedTeamView({ teamId }: SnoozedTeamViewProps) {
  const { data: contacts = [], isLoading } = useTeamContacts(teamId);
  const updateContact = useUpdateTeamContact();

  const snoozedContacts = useMemo(() => {
    return contacts
      .filter((c) => c.snoozed_until)
      .sort((a, b) => (a.snoozed_until! > b.snoozed_until! ? 1 : -1));
  }, [contacts]);

  const handleWake = (contact: DealTeamContact) => {
    updateContact.mutate({
      id: contact.id,
      teamId,
      category: (contact.snoozed_from_category as DealTeamContact['category']) || contact.category,
    });
    // Clear snooze fields via direct update
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase
        .from('deal_team_contacts')
        .update({ snoozed_until: null, snooze_reason: null, snoozed_from_category: null })
        .eq('id', contact.id)
        .then();
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (snoozedContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Moon className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-1">Brak odłożonych kontaktów</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Kontakty odłożone (Snooze) pojawią się tutaj z datą automatycznego powrotu.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kontakt</TableHead>
            <TableHead>Firma</TableHead>
            <TableHead>Kategoria</TableHead>
            <TableHead>Data powrotu</TableHead>
            <TableHead>Powód</TableHead>
            <TableHead className="text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snoozedContacts.map((contact) => {
            const returnDate = contact.snoozed_until ? parseISO(contact.snoozed_until) : null;
            const isOverdue = returnDate ? isPast(returnDate) : false;
            const origCategory = contact.snoozed_from_category || contact.category;
            const catInfo = categoryLabels[origCategory] || { label: origCategory, icon: '' };

            return (
              <TableRow key={contact.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                <TableCell className="font-medium">
                  {contact.contact?.full_name || '—'}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {contact.contact?.company || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {catInfo.icon} {catInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {returnDate ? (
                    <span className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                      <AlarmClock className="h-3.5 w-3.5" />
                      {format(returnDate, 'd MMM yyyy', { locale: pl })}
                      {isOverdue && <Badge variant="destructive" className="text-[10px] ml-1">Przeterminowane</Badge>}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {contact.snooze_reason || '—'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleWake(contact)}
                    className="gap-1.5"
                  >
                    <AlarmClock className="h-3.5 w-3.5" />
                    Obudź
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
