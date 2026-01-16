import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useContacts } from '@/hooks/useContacts';
import { useCreateConsultation, useUpdateConsultation, Consultation } from '@/hooks/useConsultations';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const consultationSchema = z.object({
  contact_id: z.string().min(1, 'Wybierz kontakt'),
  scheduled_at: z.string().min(1, 'Wybierz datę i godzinę'),
  duration_minutes: z.number().min(15).max(240),
  location: z.string().optional(),
  is_virtual: z.boolean(),
  meeting_url: z.string().optional(),
  agenda: z.string().optional(),
  status: z.string(),
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation?: Consultation | null;
  prefilledContactId?: string;
}

export function ConsultationModal({
  isOpen,
  onClose,
  consultation,
  prefilledContactId,
}: ConsultationModalProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const { toast } = useToast();
  const { director } = useAuth();
  const { data: contactsData } = useContacts({ pageSize: 100 });
  const createConsultation = useCreateConsultation();
  const updateConsultation = useUpdateConsultation();

  const isEditing = !!consultation;

  const form = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      contact_id: '',
      scheduled_at: '',
      duration_minutes: 60,
      location: '',
      is_virtual: false,
      meeting_url: '',
      agenda: '',
      status: 'scheduled',
    },
  });

  const isVirtual = form.watch('is_virtual');

  useEffect(() => {
    if (consultation) {
      form.reset({
        contact_id: consultation.contact_id,
        scheduled_at: format(new Date(consultation.scheduled_at), "yyyy-MM-dd'T'HH:mm"),
        duration_minutes: consultation.duration_minutes || 60,
        location: consultation.location || '',
        is_virtual: consultation.is_virtual || false,
        meeting_url: consultation.meeting_url || '',
        agenda: consultation.agenda || '',
        status: consultation.status || 'scheduled',
      });
    } else {
      form.reset({
        contact_id: prefilledContactId || '',
        scheduled_at: '',
        duration_minutes: 60,
        location: '',
        is_virtual: false,
        meeting_url: '',
        agenda: '',
        status: 'scheduled',
      });
    }
  }, [consultation, prefilledContactId, form, isOpen]);

  const onSubmit = async (data: ConsultationFormData) => {
    if (!director) {
      toast({
        title: 'Błąd',
        description: 'Brak danych użytkownika. Zaloguj się ponownie.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        contact_id: data.contact_id,
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        duration_minutes: data.duration_minutes,
        location: data.location || null,
        is_virtual: data.is_virtual,
        meeting_url: data.is_virtual ? data.meeting_url : null,
        agenda: data.agenda || null,
        status: data.status,
        tenant_id: director.tenant_id,
        director_id: director.id,
      };

      if (isEditing && consultation) {
        await updateConsultation.mutateAsync({ id: consultation.id, ...payload });
        toast({
          title: 'Zapisano',
          description: 'Konsultacja została zaktualizowana.',
        });
      } else {
        await createConsultation.mutateAsync(payload);
        toast({
          title: 'Utworzono',
          description: 'Nowa konsultacja została zaplanowana.',
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save consultation:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać konsultacji.',
        variant: 'destructive',
      });
    }
  };

  const contacts = contactsData?.data || [];
  const selectedContact = contacts.find((c) => c.id === form.watch('contact_id'));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj konsultację' : 'Nowa konsultacja'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Contact Selection */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Kontakt *</FormLabel>
                  <Popover open={contactOpen} onOpenChange={setContactOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {selectedContact ? selectedContact.full_name : 'Wybierz kontakt...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Szukaj kontaktu..." />
                        <CommandList>
                          <CommandEmpty>Nie znaleziono kontaktów.</CommandEmpty>
                          <CommandGroup>
                            {contacts.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.full_name}
                                onSelect={() => {
                                  field.onChange(contact.id);
                                  setContactOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === contact.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div>
                                  <div>{contact.full_name}</div>
                                  {contact.company && (
                                    <div className="text-xs text-muted-foreground">
                                      {contact.company}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <FormField
              control={form.control}
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data i godzina *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Czas trwania</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 minut</SelectItem>
                      <SelectItem value="45">45 minut</SelectItem>
                      <SelectItem value="60">60 minut</SelectItem>
                      <SelectItem value="90">90 minut</SelectItem>
                      <SelectItem value="120">120 minut</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Virtual Meeting Checkbox */}
            <FormField
              control={form.control}
              name="is_virtual"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Wirtualne spotkanie</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Meeting URL (shown when virtual) */}
            {isVirtual && (
              <FormField
                control={form.control}
                name="meeting_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link do spotkania</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Location (shown when not virtual) */}
            {!isVirtual && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokalizacja</FormLabel>
                    <FormControl>
                      <Input placeholder="Adres lub miejsce spotkania" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Agenda */}
            <FormField
              control={form.control}
              name="agenda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agenda</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Co chcesz omówić na spotkaniu?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status (only show for editing) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Zaplanowana</SelectItem>
                        <SelectItem value="completed">Zakończona</SelectItem>
                        <SelectItem value="cancelled">Anulowana</SelectItem>
                        <SelectItem value="no_show">Nieobecność</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={createConsultation.isPending || updateConsultation.isPending}
              >
                {(createConsultation.isPending || updateConsultation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
