import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateMeeting, useUpdateMeeting, type GroupMeeting, type MeetingStatus } from '@/hooks/useMeetings';
import { toast } from 'sonner';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  scheduled_at: z.string().min(1, 'Data i godzina są wymagane'),
  duration_minutes: z.number().min(30).max(480),
  location: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  expected_participant_count: z.number().optional(),
  status: z.enum(['upcoming', 'in_progress', 'completed', 'cancelled']),
});

type FormValues = z.infer<typeof formSchema>;

interface MeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: GroupMeeting | null;
}

export function MeetingModal({ open, onOpenChange, meeting }: MeetingModalProps) {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const isEditing = !!meeting;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: meeting?.name ?? '',
      scheduled_at: meeting?.scheduled_at
        ? format(new Date(meeting.scheduled_at), "yyyy-MM-dd'T'HH:mm")
        : '',
      duration_minutes: meeting?.duration_minutes ?? 180,
      location: meeting?.location ?? '',
      city: meeting?.city ?? '',
      description: meeting?.description ?? '',
      expected_participant_count: meeting?.expected_participant_count ?? undefined,
      status: (meeting?.status as MeetingStatus) ?? 'upcoming',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && meeting) {
        await updateMeeting.mutateAsync({
          id: meeting.id,
          name: values.name,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          duration_minutes: values.duration_minutes,
          location: values.location || undefined,
          city: values.city || undefined,
          description: values.description || undefined,
          expected_participant_count: values.expected_participant_count,
          status: values.status,
        });
        toast.success('Spotkanie zostało zaktualizowane');
      } else {
        await createMeeting.mutateAsync({
          name: values.name,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          duration_minutes: values.duration_minutes,
          location: values.location || undefined,
          city: values.city || undefined,
          description: values.description || undefined,
          expected_participant_count: values.expected_participant_count,
          status: values.status,
        });
        toast.success('Spotkanie zostało utworzone');
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Wystąpił błąd podczas zapisywania spotkania');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj spotkanie' : 'Nowe spotkanie'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa spotkania *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. CC Warszawa - Luty 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Czas trwania</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="120">2 godziny</SelectItem>
                        <SelectItem value="180">3 godziny</SelectItem>
                        <SelectItem value="240">4 godziny</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokalizacja</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Hotel Marriott" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miasto</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Warszawa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe informacje o spotkaniu..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expected_participant_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oczekiwana liczba uczestników</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="np. 30"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="upcoming">Nadchodzące</SelectItem>
                        <SelectItem value="in_progress">W trakcie</SelectItem>
                        <SelectItem value="completed">Zakończone</SelectItem>
                        <SelectItem value="cancelled">Anulowane</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={createMeeting.isPending || updateMeeting.isPending}
              >
                {isEditing ? 'Zapisz zmiany' : 'Utwórz spotkanie'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
