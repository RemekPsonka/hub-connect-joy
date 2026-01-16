import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Users, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { MeetingStatusBadge } from './MeetingStatusBadge';
import type { GroupMeeting } from '@/hooks/useMeetings';
import { useNavigate } from 'react-router-dom';
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

interface MeetingDetailHeaderProps {
  meeting: GroupMeeting;
  participantCount: number;
  memberCount: number;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function MeetingDetailHeader({
  meeting,
  participantCount,
  memberCount,
  onEdit,
  onDelete,
  isDeleting,
}: MeetingDetailHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/meetings')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do listy
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{meeting.name}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(meeting.scheduled_at), 'EEEE, d MMMM yyyy, HH:mm', { locale: pl })}
              </span>
            </div>

            {(meeting.location || meeting.city) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{[meeting.location, meeting.city].filter(Boolean).join(', ')}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>
                {participantCount} uczestników ({memberCount} moich członków)
              </span>
            </div>
          </div>

          {meeting.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {meeting.description}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edytuj
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Usuń
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Czy na pewno chcesz usunąć to spotkanie?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta akcja jest nieodwracalna. Spotkanie "{meeting.name}" zostanie trwale usunięte
                  wraz ze wszystkimi uczestnikami, rekomendacjami i spotkaniami 1x1.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Usuwanie...' : 'Usuń spotkanie'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
