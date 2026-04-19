import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Send, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSendEmail, useCreateDraft } from '@/hooks/useGmail';

const Schema = z.object({
  to: z.string().email('Niepoprawny adres e-mail'),
  cc: z.string().optional().or(z.literal('')),
  subject: z.string().min(1, 'Temat jest wymagany').max(200),
  body: z.string().min(1, 'Treść jest wymagana'),
});

type FormValues = z.infer<typeof Schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  contactId?: string;
}

export function ComposeEmailModal({
  open,
  onClose,
  initialTo,
  initialSubject,
  initialBody,
  contactId,
}: Props) {
  const send = useSendEmail();
  const draft = useCreateDraft();

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      to: initialTo ?? '',
      cc: '',
      subject: initialSubject ?? '',
      body: initialBody ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        to: initialTo ?? '',
        cc: '',
        subject: initialSubject ?? '',
        body: initialBody ?? '',
      });
    }
  }, [open, initialTo, initialSubject, initialBody, form]);

  const busy = send.isPending || draft.isPending;

  const handleSend = form.handleSubmit(async (values) => {
    await send.mutateAsync({
      to: values.to,
      cc: values.cc || undefined,
      subject: values.subject,
      body: values.body,
      contact_id: contactId,
    });
    onClose();
  });

  const handleDraft = form.handleSubmit(async (values) => {
    await draft.mutateAsync({
      to: values.to,
      cc: values.cc || undefined,
      subject: values.subject,
      body: values.body,
      contact_id: contactId,
    });
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Nowy e-mail
          </DialogTitle>
          <DialogDescription>
            Wyślij wiadomość przez Twoje połączone konto Gmail lub zapisz jako szkic.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="to">Do</Label>
            <Input id="to" type="email" placeholder="adres@firma.pl" {...form.register('to')} />
            {form.formState.errors.to && (
              <p className="text-xs text-destructive">{form.formState.errors.to.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc">DW (opcjonalnie)</Label>
            <Input id="cc" placeholder="cc@firma.pl, druga@firma.pl" {...form.register('cc')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Temat</Label>
            <Input id="subject" {...form.register('subject')} />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Treść</Label>
            <Textarea id="body" rows={10} {...form.register('body')} />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Anuluj
          </Button>
          <Button type="button" variant="outline" onClick={handleDraft} disabled={busy}>
            {draft.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
            Zapisz jako szkic
          </Button>
          <Button type="button" onClick={handleSend} disabled={busy}>
            {send.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Wyślij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
