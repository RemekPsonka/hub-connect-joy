import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Copy, Check } from 'lucide-react';
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
import { useContactGroups } from '@/hooks/useContacts';
import { useCreateAssistant } from '@/hooks/useAssistants';
import { toast } from 'sonner';

const formSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  fullName: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  groupIds: z.array(z.string()).min(1, 'Wybierz co najmniej jedną grupę'),
});

type FormData = z.infer<typeof formSchema>;

interface AddAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAssistantModal({ isOpen, onClose }: AddAssistantModalProps) {
  const { data: groups = [] } = useContactGroups();
  const createAssistant = useCreateAssistant();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      fullName: '',
      groupIds: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createAssistant.mutateAsync({
        email: data.email,
        fullName: data.fullName,
        groupIds: data.groupIds,
      });
      setTempPassword(result.tempPassword);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success('Hasło skopiowane do schowka');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    form.reset();
    setTempPassword(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj asystenta</DialogTitle>
          <DialogDescription>
            Utwórz nowego asystenta z dostępem do wybranych grup kontaktów.
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium mb-2">
                Asystent został utworzony!
              </p>
              <p className="text-sm text-green-700 mb-4">
                Przekaż poniższe hasło tymczasowe asystentowi. Powinien je zmienić po pierwszym logowaniu.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border rounded px-3 py-2 font-mono text-sm">
                  {tempPassword}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Zamknij
            </Button>
          </div>
        ) : (
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jan.kowalski@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                      Asystent będzie mógł widzieć tylko kontakty z wybranych grup.
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
                <Button type="button" variant="outline" onClick={handleClose}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={createAssistant.isPending}>
                  {createAssistant.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Utwórz asystenta
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
