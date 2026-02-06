import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOwnerPanel } from '@/hooks/useOwnerPanel';
import { DealTeam, useCreateDealTeam, useUpdateDealTeam } from '@/hooks/useDealTeams';

const TEAM_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#3b82f6', // blue
];

const formSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(100),
  description: z.string().optional(),
  color: z.string(),
  member_ids: z.array(z.string()).min(1, 'Wybierz co najmniej jednego członka'),
});

type FormValues = z.infer<typeof formSchema>;

interface DealTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team?: DealTeam | null;
}

export function DealTeamModal({ isOpen, onClose, team }: DealTeamModalProps) {
  const { users } = useOwnerPanel();
  const createTeam = useCreateDealTeam();
  const updateTeam = useUpdateDealTeam();

  const isEditing = !!team;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      color: TEAM_COLORS[0],
      member_ids: [],
    },
  });

  useEffect(() => {
    if (team) {
      form.reset({
        name: team.name,
        description: team.description || '',
        color: team.color,
        member_ids: team.members?.map(m => m.director_id) || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        color: TEAM_COLORS[0],
        member_ids: [],
      });
    }
  }, [team, form]);

  const onSubmit = async (values: FormValues) => {
    if (isEditing && team) {
      await updateTeam.mutateAsync({
        id: team.id,
        name: values.name,
        description: values.description || null,
        color: values.color,
        member_ids: values.member_ids,
      });
    } else {
      await createTeam.mutateAsync({
        name: values.name,
        description: values.description || null,
        color: values.color,
        member_ids: values.member_ids,
      });
    }
    onClose();
  };

  const isPending = createTeam.isPending || updateTeam.isPending;

  // Get all users who can be team members (all directors in tenant)
  const directors = users;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj zespół' : 'Nowy zespół deals'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-1 flex flex-col">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa zespołu *</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. SGU, Remek-Paweł" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opcjonalny opis zespołu..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kolor</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            field.value === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="member_ids"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Członkowie zespołu *</FormLabel>
                  <ScrollArea className="h-[200px] border rounded-md p-3">
                    <div className="space-y-2">
                      {directors.map((user) => {
                        // Find director_id from user
                        const directorId = user.id; // user.id is director.id from useOwnerPanel

                        return (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`member-${user.id}`}
                              checked={field.value.includes(directorId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, directorId]);
                                } else {
                                  field.onChange(field.value.filter((id) => id !== directorId));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`member-${user.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <span className="font-medium">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {user.email}
                              </span>
                            </Label>
                          </div>
                        );
                      })}
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Zapisz zmiany' : 'Utwórz zespół'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
