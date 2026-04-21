import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserPlus } from 'lucide-react';
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
  owner?: { id: string; full_name: string } | null;
  assignees: TaskAssignee[];
  onAddClick?: () => void;
}

export function AssigneeAvatars({ owner, assignees, onAddClick }: Props) {
  const items: TaskAssignee[] = [];
  if (owner) items.push({ id: owner.id, full_name: owner.full_name });
  for (const a of assignees) {
    if (!items.some((x) => x.id === a.id)) items.push(a);
  }

  if (!items.length) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddClick?.(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-5 w-5 rounded-full border border-dashed border-primary/50 text-primary/70 hover:text-primary hover:border-primary flex items-center justify-center shrink-0 transition"
            aria-label="Dodaj opiekuna zadania"
          >
            <UserPlus className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Dodaj opiekuna zadania</TooltipContent>
      </Tooltip>
    );
  }
  const visible = items.slice(0, 3);
  const extra = items.length - visible.length;

  return (
    <div className="flex items-center -space-x-1 shrink-0">
      {visible.map((a, idx) => {
        const isOwner = !!owner && a.id === owner.id && idx === 0;
        return (
        <Tooltip key={a.id}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'h-5 w-5 rounded-full ring-2 ring-background flex items-center justify-center text-[9px] font-semibold text-white',
                colorFor(a.id),
                isOwner && 'ring-primary/40',
              )}
            >
              {initials(a.full_name)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isOwner ? `Opiekun: ${a.full_name}` : a.full_name}
          </TooltipContent>
        </Tooltip>
        );
      })}
      {extra > 0 && (
        <div className="h-5 min-w-5 px-1 rounded-full ring-2 ring-background bg-muted text-[9px] font-semibold text-muted-foreground flex items-center justify-center">
          +{extra}
        </div>
      )}
    </div>
  );
}
