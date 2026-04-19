import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ComposeEmailModal } from '@/components/email/ComposeEmailModal';

interface IntroPerson {
  id: string;
  full_name: string;
  email?: string | null;
  company?: string | null;
}

interface Props {
  intermediate: IntroPerson;
  target: { full_name: string; company?: string | null };
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export function RequestIntroButton({
  intermediate,
  target,
  size = 'sm',
  variant = 'outline',
}: Props) {
  const [open, setOpen] = useState(false);
  const disabled = !intermediate.email;

  const firstName = intermediate.full_name.split(' ')[0] || intermediate.full_name;
  const targetLabel = target.company
    ? `${target.full_name} (${target.company})`
    : target.full_name;

  const subject = `Prośba o przedstawienie — ${target.full_name}`;
  const body = [
    `Cześć ${firstName},`,
    '',
    `mam prośbę — czy mógłbyś przedstawić mnie ${targetLabel}? Z tego co wiem, znacie się i bardzo zależy mi na nawiązaniu kontaktu.`,
    '',
    'Krótko o powodzie: [dopisz tu kontekst rozmowy].',
    '',
    'Jeśli będzie Ci wygodniej, mogę przygotować krótkie wprowadzenie do przekazania.',
    '',
    'Dzięki z góry!',
  ].join('\n');

  const button = (
    <Button
      size={size}
      variant={variant}
      onClick={() => setOpen(true)}
      disabled={disabled}
    >
      <Mail className="h-4 w-4 mr-1.5" />
      Poproś o intro
    </Button>
  );

  return (
    <>
      {disabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">{button}</span>
            </TooltipTrigger>
            <TooltipContent>Brak adresu e-mail dla tego kontaktu</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <ComposeEmailModal
        open={open}
        onClose={() => setOpen(false)}
        initialTo={intermediate.email ?? ''}
        initialSubject={subject}
        initialBody={body}
        contactId={intermediate.id}
      />
    </>
  );
}
