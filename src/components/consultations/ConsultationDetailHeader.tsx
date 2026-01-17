import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, Calendar, Clock, Edit, MapPin, Trash2, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConsultationWithContact, useDeleteConsultation, useUpdateConsultation } from '@/hooks/useConsultations';
import { useToast } from '@/hooks/use-toast';

interface ConsultationDetailHeaderProps {
  consultation: ConsultationWithContact;
  onEdit: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ConsultationDetailHeader({ consultation, onEdit }: ConsultationDetailHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const deleteConsultation = useDeleteConsultation();
  const updateConsultation = useUpdateConsultation();

  const contact = consultation.contacts;
  const scheduledAt = new Date(consultation.scheduled_at);

  const handleDelete = async () => {
    try {
      await deleteConsultation.mutateAsync({ id: consultation.id, contactId: consultation.contact_id });
      toast({
        title: 'Usunięto',
        description: 'Konsultacja została usunięta.',
      });
      navigate('/consultations');
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć konsultacji.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateConsultation.mutateAsync({ id: consultation.id, status });
      toast({
        title: 'Zapisano',
        description: 'Status został zaktualizowany.',
      });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować statusu.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/consultations')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do konsultacji
      </Button>

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Contact Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getInitials(contact.full_name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1
              className="text-xl font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
              onClick={() => navigate(`/contacts/${contact.id}`)}
            >
              {contact.full_name}
            </h1>
            {contact.company && (
              <p className="text-muted-foreground">{contact.company}</p>
            )}

            {/* Date, Time, Location */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(scheduledAt, 'd MMMM yyyy', { locale: pl })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>
                  {format(scheduledAt, 'HH:mm')} ({consultation.duration_minutes || 60} min)
                </span>
              </div>
              {consultation.is_virtual ? (
                <div className="flex items-center gap-1.5">
                  <Video className="h-4 w-4" />
                  <span>Online</span>
                  {consultation.meeting_url && (
                    <a
                      href={consultation.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      (otwórz link)
                    </a>
                  )}
                </div>
              ) : consultation.location ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{consultation.location}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <Select
            value={consultation.status || 'scheduled'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Zaplanowana</SelectItem>
              <SelectItem value="completed">Zakończona</SelectItem>
              <SelectItem value="cancelled">Anulowana</SelectItem>
              <SelectItem value="no_show">Nieobecność</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usuń konsultację?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta operacja jest nieodwracalna. Konsultacja zostanie trwale usunięta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Usuń</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
