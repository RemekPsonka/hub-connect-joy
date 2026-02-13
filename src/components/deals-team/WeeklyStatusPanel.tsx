import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useWeeklyStatuses, useOverdueContacts } from '@/hooks/useWeeklyStatuses';
import { WeeklyStatusForm } from './WeeklyStatusForm';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface WeeklyStatusPanelProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyStatusPanel({ teamId, open, onOpenChange }: WeeklyStatusPanelProps) {
  const { data: overdueContacts = [], isLoading: overdueLoading } = useOverdueContacts(teamId);
  const { data: weeklyStatuses = [], isLoading: statusesLoading } = useWeeklyStatuses(teamId);

  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string;
    company: string | null;
    contactId?: string;
  } | null>(null);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'dd.MM', { locale: pl })} - ${format(weekEnd, 'dd.MM.yyyy', { locale: pl })}`;

  const isLoading = overdueLoading || statusesLoading;

  const handleAddStatus = (contact: {
    id: string;
    name: string;
    company: string | null;
    contactId?: string;
  }) => {
    setSelectedContact(contact);
  };

  const handleCloseStatusForm = () => {
    setSelectedContact(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Statusy
            </SheetTitle>
            <p className="text-sm text-muted-foreground">Tydzień: {weekLabel}</p>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-6 pr-4">
              {/* Overdue section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <h3 className="font-semibold text-sm">
                    Wymagają statusu ({overdueContacts.length})
                  </h3>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : overdueContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Wszystkie statusy są aktualne 🎉
                  </p>
                ) : (
                  <div className="space-y-2">
                    {overdueContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5 border-destructive/20"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                contact.daysWithoutStatus && contact.daysWithoutStatus > 10
                                  ? 'bg-destructive'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <p className="font-medium text-sm truncate">
                              {contact.contact?.full_name || 'Nieznany kontakt'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {contact.category.toUpperCase()} •{' '}
                            {contact.daysWithoutStatus
                              ? `${contact.daysWithoutStatus} dni bez statusu`
                              : 'Brak statusów'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs"
                          onClick={() =>
                            handleAddStatus({
                              id: contact.id,
                              name: contact.contact?.full_name || 'Nieznany',
                              company: contact.contact?.company || null,
                              contactId: contact.contact_id,
                            })
                          }
                        >
                          Dodaj status
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Submitted this week section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Złożone w tym tygodniu ({weeklyStatuses.length})
                  </h3>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : weeklyStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Brak złożonych statusów w tym tygodniu
                  </p>
                ) : (
                  <div className="space-y-2">
                    {weeklyStatuses.map((status) => (
                      <div
                        key={status.id}
                        className="p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          <p className="font-medium text-sm">
                            {status.team_contact?.contact?.full_name || 'Nieznany kontakt'}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {status.team_contact?.category?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          "{status.status_summary}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          — {status.reporter?.full_name || 'Nieznany'},{' '}
                          {status.created_at
                            ? format(new Date(status.created_at), 'd MMM HH:mm', {
                                locale: pl,
                              })
                            : 'Nieznana data'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Status Form Dialog */}
      {selectedContact && (
        <WeeklyStatusForm
          teamContactId={selectedContact.id}
          teamId={teamId}
          contactId={selectedContact.contactId}
          contactName={selectedContact.name}
          contactCompany={selectedContact.company}
          open={!!selectedContact}
          onClose={handleCloseStatusForm}
        />
      )}
    </>
  );
}
