import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, ExternalLink, Loader2, Unlink, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGCalConnection,
  useGCalConnect,
  useGCalDisconnect,
  useGCalCalendars,
  useUpdateSelectedCalendars,
} from '@/hooks/useGoogleCalendar';

export function GoogleCalendarSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isConnected, connectedEmail, selectedCalendars, isLoading } = useGCalConnection();
  const connect = useGCalConnect();
  const disconnect = useGCalDisconnect();
  const { data: calendars = [], isLoading: isLoadingCalendars } = useGCalCalendars(isConnected);
  const updateCalendars = useUpdateSelectedCalendars();

  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with server state
  useEffect(() => {
    setLocalSelected(selectedCalendars);
    setHasChanges(false);
  }, [selectedCalendars]);

  // Handle OAuth callback params
  useEffect(() => {
    const gcalParam = searchParams.get('gcal');
    if (gcalParam === 'connected') {
      toast.success('Google Calendar połączony!');
      queryClient.invalidateQueries({ queryKey: ['gcal-connection'] });
      queryClient.invalidateQueries({ queryKey: ['gcal-calendars'] });
      // Clean URL
      searchParams.delete('gcal');
      setSearchParams(searchParams, { replace: true });
    } else if (gcalParam === 'error') {
      const reason = searchParams.get('reason') || 'unknown';
      toast.error(`Błąd połączenia z Google Calendar: ${reason}`);
      searchParams.delete('gcal');
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const toggleCalendar = (calId: string) => {
    setLocalSelected((prev) => {
      const next = prev.includes(calId) ? prev.filter((id) => id !== calId) : [...prev, calId];
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    updateCalendars.mutate(localSelected);
    setHasChanges(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Właściciel';
      case 'writer':
        return 'Edytor';
      case 'reader':
        return 'Tylko odczyt';
      case 'freeBusyReader':
        return 'Wolny/Zajęty';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Synchronizuj spotkania i wydarzenia z kalendarza Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          /* ─── Disconnected state ─── */
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-base font-semibold mb-1">Połącz Google Calendar</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Synchronizuj spotkania i wydarzenia z kalendarza Google.
              Twoje spotkania pojawią się w widoku "Mój Dzień".
            </p>
            <Button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              className="gap-2"
            >
              {connect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Połącz konto Google
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Wymagane uprawnienia: odczyt kalendarza (tylko do odczytu)
            </p>
          </div>
        ) : (
          /* ─── Connected state ─── */
          <div className="space-y-6">
            {/* Connection info */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{connectedEmail}</p>
                  <Badge
                    variant="secondary"
                    className="mt-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Połączono
                  </Badge>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                    <Unlink className="h-3.5 w-3.5" />
                    Rozłącz
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rozłączyć Google Calendar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Spotkania z Google Calendar nie będą już widoczne w aplikacji.
                      Możesz ponownie połączyć konto w dowolnym momencie.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => disconnect.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {disconnect.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Rozłącz
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Calendar selection */}
            <div>
              <h4 className="text-sm font-medium mb-3">Wybierz kalendarze do synchronizacji</h4>

              {isLoadingCalendars ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : calendars.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nie znaleziono kalendarzy
                </p>
              ) : (
                <div className="space-y-1">
                  {calendars.map((cal) => (
                    <button
                      key={cal.id}
                      onClick={() => toggleCalendar(cal.id)}
                      className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <Checkbox
                        checked={localSelected.includes(cal.id)}
                        onCheckedChange={() => toggleCalendar(cal.id)}
                        className="shrink-0"
                      />
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cal.backgroundColor }}
                      />
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">
                        {cal.summary}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {getRoleBadge(cal.accessRole)}
                        </span>
                        {cal.primary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Główny
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {calendars.length > 0 && (
                <div className="pt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Zaznaczone kalendarze będą widoczne w Mój Dzień i Kalendarzu
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!hasChanges || updateCalendars.isPending}
                  >
                    {updateCalendars.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Zapisz wybór
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
