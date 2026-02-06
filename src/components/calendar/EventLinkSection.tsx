import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Users, FolderKanban, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { useEventLinks, useCreateEventLink, useRemoveEventLink } from '@/hooks/useGCalLinks';
import { LinkSearchDialog } from './LinkSearchDialog';
import type { CalendarItem } from '@/types/calendar';

interface EventLinkSectionProps {
  item: CalendarItem;
}

const TYPE_ICONS = {
  task: CheckSquare,
  contact: Users,
  project: FolderKanban,
} as const;

const TYPE_ROUTES = {
  task: '/tasks',
  contact: '/contacts',
  project: '/projects',
} as const;

export function EventLinkSection({ item }: EventLinkSectionProps) {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Parse real GCal event ID (remove "gcal-" prefix)
  const gcalEventId = item.id.startsWith('gcal-') ? item.id.slice(5) : null;

  const { data: links = [], isLoading } = useEventLinks(gcalEventId);
  const createLink = useCreateEventLink();
  const removeLink = useRemoveEventLink();

  if (!gcalEventId) return null;

  const handleLinkSelect = (type: 'task' | 'contact' | 'project', id: string) => {
    // Extract calendar ID from the item (calendarName or fallback)
    createLink.mutate({
      gcalEventId,
      gcalCalendarId: item.calendarName || 'primary',
      linkedType: type,
      linkedId: id,
    });
  };

  const handleRemove = (linkId: string) => {
    removeLink.mutate({ linkId, gcalEventId });
  };

  const handleNavigate = (type: string, id: string) => {
    const route = TYPE_ROUTES[type as keyof typeof TYPE_ROUTES];
    if (route) {
      navigate(type === 'task' ? route : `${route}/${id}`);
    }
  };

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Powiązania
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {links.length > 0 && (
              <div className="space-y-0.5">
                {links.map((link) => {
                  const Icon = TYPE_ICONS[link.type];
                  return (
                    <div key={link.linkId} className="flex items-center gap-2 py-1 group">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => handleNavigate(link.type, link.id)}
                        className="text-xs text-foreground hover:text-primary truncate flex-1 text-left transition-colors"
                      >
                        {link.name}
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive text-muted-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć powiązanie?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Powiązanie z "{link.name}" zostanie usunięte.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(link.linkId)}>
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs h-7"
              onClick={() => setIsSearchOpen(true)}
              disabled={createLink.isPending}
            >
              {createLink.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Dodaj powiązanie
            </Button>
          </>
        )}
      </div>

      <LinkSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelect={handleLinkSelect}
      />
    </>
  );
}
