import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import { useInviteRep } from '@/hooks/useInviteRep';

const Schema = z.object({
  email: z.string().trim().email('Nieprawidłowy email'),
  first_name: z.string().trim().min(1, 'Imię wymagane'),
  last_name: z.string().trim().min(1, 'Nazwisko wymagane'),
  phone: z.string().trim().optional(),
  region: z.string().trim().optional(),
});

type FormData = z.infer<typeof Schema>;

export function InviteRepDialog() {
  const [open, setOpen] = useState(false);
  const invite = useInviteRep();

  const form = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', first_name: '', last_name: '', phone: '', region: '' },
  });

  const onSubmit = async (data: FormData) => {
    await invite.mutateAsync(data);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Zaproś przedstawiciela
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zaproś przedstawiciela SGU</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">Imię *</Label>
              <Input id="first_name" {...form.register('first_name')} />
              {form.formState.errors.first_name && (
                <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nazwisko *</Label>
              <Input id="last_name" {...form.register('last_name')} />
              {form.formState.errors.last_name && (
                <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" {...form.register('phone')} placeholder="+48 600 000 000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input id="region" {...form.register('region')} placeholder="Mazowsze" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
