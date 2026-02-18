import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Building2, Target, Share2, Trash2, Clock, Users } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { WantedContact, useDeleteWantedContact } from '@/hooks/useWantedContacts';
import { MatchWantedDialog } from './MatchWantedDialog';
import { ShareWantedDialog } from './ShareWantedDialog';
import { WantedAISuggestions } from './WantedAISuggestions';
import { RequesterInfo } from '@/utils/wantedGrouping';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const urgencyColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  active: 'Aktywny',
  in_progress: 'W trakcie',
  fulfilled: 'Znaleziony',
  cancelled: 'Anulowany',
  expired: 'Wygasły',
};

const urgencyLabels: Record<string, string> = {
  low: 'Niska',
  normal: 'Normalna',
  high: 'Wysoka',
  critical: 'Krytyczna',
};

export function WantedContactCard({ item, otherRequesters }: { item: WantedContact; otherRequesters?: RequesterInfo[] }) {
  const [matchOpen, setMatchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const deleteWanted = useDeleteWantedContact();

  const title = item.person_name && item.company_name
    ? `${item.person_name} — ${item.company_name}`
    : item.person_name || item.company_name || 'Brak danych';

  const subtitle = item.person_name
    ? [item.person_position, item.person_context].filter(Boolean).join(' · ')
    : [item.company_context, item.company_industry].filter(Boolean).join(' · ');

  const isExpired = item.status === 'expired' || (item.expires_at && isPast(new Date(item.expires_at)));
  const daysLeft = item.expires_at ? differenceInDays(new Date(item.expires_at), new Date()) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !isExpired;

  return (
    <Card className={`hover:border-primary/30 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {item.person_name ? <User className="h-4 w-4 text-primary shrink-0" /> : <Building2 className="h-4 w-4 text-primary shrink-0" />}
              <h3 className="font-semibold text-sm truncate">{title}</h3>
            </div>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            {item.company_nip && <p className="text-xs text-muted-foreground">NIP: {item.company_nip}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={urgencyColors[item.urgency]}>
              {urgencyLabels[item.urgency]}
            </Badge>
            <Badge variant={item.status === 'fulfilled' ? 'default' : 'secondary'}>
              {statusLabels[item.status]}
            </Badge>
          </div>
        </div>

        {/* Search context */}
        {item.search_context && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 line-clamp-2">{item.search_context}</p>
        )}

        {/* Expiration info */}
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className={`h-3.5 w-3.5 ${isExpiringSoon ? 'text-orange-500' : isExpired ? 'text-destructive' : 'text-muted-foreground'}`} />
          {item.expires_at ? (
            <span className={isExpiringSoon ? 'text-orange-500 font-medium' : isExpired ? 'text-destructive' : 'text-muted-foreground'}>
              {isExpired
                ? `Wygasł ${format(new Date(item.expires_at), 'd MMM yyyy', { locale: pl })}`
                : `Do: ${format(new Date(item.expires_at), 'd MMM yyyy', { locale: pl })}${isExpiringSoon ? ` (${daysLeft} dni)` : ''}`}
            </span>
          ) : (
            <span className="text-muted-foreground">Bez limitu</span>
          )}
        </div>

        {/* Requester */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Szuka:{' '}
            <Link to={`/contacts/${item.requested_by_contact_id}`} className="text-primary hover:underline">
              {item.requested_by_contact?.full_name || 'Nieznany'}
            </Link>
          </span>
          {item.matched_contact && (
            <span className="text-green-500">
              Dopasowano: <Link to={`/contacts/${item.matched_contact.id}`} className="hover:underline">{item.matched_contact.full_name}</Link>
            </span>
          )}
        </div>

        {/* Other requesters */}
        {otherRequesters && otherRequesters.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              Szukają także:{' '}
              {otherRequesters.slice(0, 3).map((r, i) => (
                <Fragment key={r.contactId}>
                  {i > 0 && ', '}
                  <Link to={`/contacts/${r.contactId}`} className="font-medium hover:underline">{r.name}</Link>
                </Fragment>
              ))}
              {otherRequesters.length > 3 && ` (+${otherRequesters.length - 3} więcej)`}
            </span>
          </div>
        )}

        {/* AI suggestions */}
        {item.status === 'active' && (item.company_industry || item.company_name) && (
          <WantedAISuggestions industry={item.company_industry || item.company_name} wantedId={item.id} />
        )}

        {/* Actions */}
        {item.status === 'active' && !isExpired && (
          <div className="flex items-center gap-2 pt-1 border-t">
            <Button size="sm" variant="outline" onClick={() => setMatchOpen(true)} className="gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" /> Znam tę osobę!
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShareOpen(true)} className="gap-1.5 text-xs">
              <Share2 className="h-3.5 w-3.5" /> Udostępnij
            </Button>
            <div className="flex-1" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć poszukiwanego?</AlertDialogTitle>
                  <AlertDialogDescription>Ta operacja jest nieodwracalna.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteWanted.mutate(item.id)}>Usuń</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <MatchWantedDialog open={matchOpen} onOpenChange={setMatchOpen} wantedId={item.id} />
        <ShareWantedDialog open={shareOpen} onOpenChange={setShareOpen} wantedId={item.id} />
      </CardContent>
    </Card>
  );
}
