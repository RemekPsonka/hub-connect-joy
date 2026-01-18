import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useContactGroups } from '@/hooks/useContacts';
import { useUpdateAssistant, useUpdateAssistantGroups, type Assistant } from '@/hooks/useAssistants';

const formSchema = z.object({
  fullName: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  isActive: z.boolean(),
  groupIds: z.array(z.string()).min(1, 'Wybierz co najmniej jedną grupę'),
});

type FormData = z.infer<typeof formSchema>;

interface EditAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistant: Assistant | null;
}

export function EditAssistantModal({ isOpen, onClose, assistant }: EditAssistantModalProps) {
  const { data: groups = [] } = useContactGroups();
  const updateAssistant = useUpdateAssistant();
  const updateGroups = useUpdateAssistantGroups();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      isActive: true,
      groupIds: [],
    },
  });

  useEffect(() => {
    if (assistant) {
      form.reset({
        fullName: assistant.full_name,
        isActive: assistant.is_active,
        groupIds: assistant.allowed_groups?.map((g) => g.group_id) || [],
      });
    }
  }, [assistant, form]);

  const onSubmit = async (data: FormData) => {
    if (!assistant) return;

    try {
      // Update assistant data
      await updateAssistant.mutateAsync({
        assistantId: assistant.id,
        fullName: data.fullName,
        isActive: data.isActive,
      });

      // Update groups
      await updateGroups.mutateAsync({
        assistantId: assistant.id,
        groupIds: data.groupIds,
      });

      onClose();
    } catch (error) {
      // Error handled in mutations
    }
  };

  const isPending = updateAssistant.isPending || updateGroups.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edytuj asystenta</DialogTitle>
          <DialogDescription>
            Zmień dane asystenta i jego dostęp do grup kontaktów.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię i nazwisko</FormLabel>
                  <FormControl>
                    <Input placeholder="Jan Kowalski" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Email</p>
              <p className="text-sm text-muted-foreground">{assistant?.email}</p>
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Aktywny</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Wyłączenie blokuje dostęp asystenta do systemu
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupIds"
              render={() => (
                <FormItem>
                  <FormLabel>Grupy kontaktów</FormLabel>
                  <p className="text-sm text-muted-foreground mb-2">
                    Asystent widzi tylko kontakty z wybranych grup.
                  </p>
                  <ScrollArea className="h-[200px] border rounded-lg p-3">
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <FormField
                          key={group.id}
                          control={form.control}
                          name="groupIds"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, group.id]);
                                    } else {
                                      field.onChange(
                                        current.filter((id) => id !== group.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: group.color || '#6366f1' }}
                                />
                                <span className="text-sm font-medium">
                                  {group.name}
                                </span>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                      {groups.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Brak grup kontaktów
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz zmiany
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
