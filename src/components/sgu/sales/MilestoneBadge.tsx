import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MilestoneBadgeProps {
  k1MeetingDoneAt: string | null;
  k2HandshakeAt: string | null;
  k2PoaSignedAt: string | null;
  k3AuditDoneAt: string | null;
  k4WonAt: string | null;
}

const dateFmt = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function fmt(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

const baseClass =
  'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none border transition-colors';
const onClass = 'bg-emerald-600 text-white border-emerald-600';
const offClass = 'bg-muted text-muted-foreground border-border';

export function MilestoneBadge({
  k1MeetingDoneAt,
  k2HandshakeAt,
  k2PoaSignedAt,
  k3AuditDoneAt,
  k4WonAt,
}: MilestoneBadgeProps) {
  // Hide entirely if nothing has been reached yet
  if (!k1MeetingDoneAt && !k2HandshakeAt && !k2PoaSignedAt && !k3AuditDoneAt && !k4WonAt) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1" aria-label="Kamienie milowe K1-K4">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k1MeetingDoneAt ? onClass : offClass)}>K1</span>
          </TooltipTrigger>
          <TooltipContent>
            {k1MeetingDoneAt ? `Spotkanie odbyte: ${fmt(k1MeetingDoneAt)}` : 'Brak spotkania (K1)'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k2HandshakeAt ? onClass : offClass)}>K2</span>
          </TooltipTrigger>
          <TooltipContent>
            {k2HandshakeAt ? `Handshake: ${fmt(k2HandshakeAt)}` : 'Brak handshake (K2)'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k2PoaSignedAt ? onClass : offClass)}>K2+</span>
          </TooltipTrigger>
          <TooltipContent>
            {k2PoaSignedAt ? `Pełnomocnictwo: ${fmt(k2PoaSignedAt)}` : 'Brak pełnomocnictwa (K2+)'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k3AuditDoneAt ? onClass : offClass)}>K3</span>
          </TooltipTrigger>
          <TooltipContent>
            {k3AuditDoneAt ? `Audyt: ${fmt(k3AuditDoneAt)}` : 'Brak audytu (K3)'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(baseClass, k4WonAt ? onClass : offClass)}>K4</span>
          </TooltipTrigger>
          <TooltipContent>
            {k4WonAt ? `Polisa wygrana: ${fmt(k4WonAt)}` : 'Brak wygranej (K4)'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}