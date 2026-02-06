import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Clock,
  MapPin,
  CalendarDays,
  FolderOpen,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { CalendarItem } from '@/types/calendar';
import { EventLinkSection } from './EventLinkSection';

interface CalendarEventPopoverProps {
  item: CalendarItem;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Do zrobienia',
  in_progress: 'W toku',
  done: 'Ukończone',
  blocked: 'Zablokowane',
};

export function CalendarEventPopover({ item, children }: CalendarEventPopoverProps) {
  const navigate = useNavigate();

  const timeLabel = item.allDay
    ? 'Cały dzień'
    : `${format(item.start, 'HH:mm')} – ${format(item.end, 'HH:mm')}`;

  const taskId = item.type === 'crm_task' ? item.id.replace('task-', '') : null;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="right">
        {/* Color bar */}
        <div className="h-1 rounded-t-md" style={{ backgroundColor: item.color }} />

        <div className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{timeLabel}</span>
            </div>

            {item.location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.location}</span>
              </div>
            )}

            {item.calendarName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{item.calendarName}</span>
              </div>
            )}

            {item.projectName && (
              <div className="flex items-center gap-2 text-xs">
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Badge variant="secondary" className="text-[10px]">
                  {item.projectName}
                </Badge>
              </div>
            )}

            {item.status && (
              <Badge variant="outline" className="text-[10px]">
                {STATUS_LABELS[item.status] || item.status}
              </Badge>
            )}
          </div>

          <Separator />

          {item.type === 'gcal_event' && item.htmlLink && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => window.open(item.htmlLink, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Otwórz w Google Calendar
            </Button>
          )}

          {item.type === 'crm_task' && taskId && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => navigate('/tasks')}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Otwórz zadanie
            </Button>
          )}

          {/* Event links section — only for GCal events */}
          {item.type === 'gcal_event' && <EventLinkSection item={item} />}
        </div>
      </PopoverContent>
    </Popover>
  );
}
