import { BarChart3, Calendar, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useContactStats, type ContactWithDetails } from '@/hooks/useContacts';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { GroupBadge } from './GroupBadge';

interface ContactQuickStatsProps {
  contact: ContactWithDetails;
}

const sourceLabels: Record<string, string> = {
  manual: 'Ręcznie',
  business_card: 'Wizytówka',
  linkedin: 'LinkedIn',
  referral: 'Polecenie',
  import: 'Import',
};

export function ContactQuickStats({ contact }: ContactQuickStatsProps) {
  const { data: stats } = useContactStats(contact.id);

  const formatLastContact = (date: string | null) => {
    if (!date) return 'Brak';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Szybkie statystyki
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold text-primary">{stats?.needs || 0}</p>
            <p className="text-xs text-muted-foreground">Potrzeby</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold text-primary">{stats?.offers || 0}</p>
            <p className="text-xs text-muted-foreground">Oferty</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-lg font-bold text-primary">{stats?.tasks || 0}</p>
            <p className="text-xs text-muted-foreground">Zadania</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-1 border-t text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Ostatni kontakt</span>
            <span className="font-medium">{formatLastContact(contact.last_contact_date)}</span>
          </div>

          {contact.met_date && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Data poznania</span>
              <span className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(contact.met_date).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}

          {contact.source && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Źródło</span>
              <span className="font-medium">{sourceLabels[contact.source] || contact.source}</span>
            </div>
          )}

          {contact.contact_groups && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Grupa</span>
              <GroupBadge group={contact.contact_groups} className="text-xs py-0 px-1.5" />
            </div>
          )}
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="pt-1 border-t">
            <div className="flex items-center gap-1 mb-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tagi</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
