import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useGenerateAgendaProposal } from '@/hooks/odprawa/useGenerateAgendaProposal';

interface Props {
  teamId: string | null | undefined;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

export function AgendaAIRefreshButton({ teamId, size = 'sm', variant = 'outline' }: Props) {
  const mut = useGenerateAgendaProposal();
  const disabled = !teamId || mut.isPending;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disabled}
      onClick={() => teamId && mut.mutate(teamId)}
      className="gap-1.5"
    >
      {mut.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {mut.isPending ? 'Analizuję…' : 'Wygeneruj agendę AI'}
    </Button>
  );
}