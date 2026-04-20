import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TaskAssignee } from '@/hooks/useActiveTaskContacts';

const PALETTE = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const s = parts.map((p) => p[0]?.toUpperCase()).join('');
  return s || '?';
}

interface Props {
  assignees: TaskAssignee[];
}

export function AssigneeAvatars({ assignees }: Props) {
  if (!assignees.length) return null;
  const visible = assignees.slice(0, 3);
  const extra = assignees.length - visible.length;

  return (
    <div className="flex items-center -space-x-1 shrink-0">
      {visible.map((a) => (
        <Tooltip key={a.id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'h-5 w-5 rounded-full ring-2 ring-background flex items-center justify-center text-[9px] font-semibold text-white',
                colorFor(a.id),
              )}
            >
              {initials(a.full_name)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">{a.full_name}</TooltipContent>
        </Tooltip>
      ))}
      {extra > 0 && (
        <div className="h-5 min-w-5 px-1 rounded-full ring-2 ring-background bg-muted text-[9px] font-semibold text-muted-foreground flex items-center justify-center">
          +{extra}
        </div>
      )}
    </div>
  );
}
