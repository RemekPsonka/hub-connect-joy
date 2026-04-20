import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SubcategoryOption {
  value: string;
  label: string;
  className?: string;
  icon?: ReactNode;
}

interface EditableSubcategoryBadgeProps {
  value: string | null | undefined;
  options: SubcategoryOption[];
  emptyLabel?: string;
  onSelect: (value: string) => void;
  ariaLabel: string;
}

export function EditableSubcategoryBadge({
  value,
  options,
  emptyLabel = '(brak)',
  onSelect,
  ariaLabel,
}: EditableSubcategoryBadgeProps) {
  const [open, setOpen] = useState(false);
  const current = value ? options.find((o) => o.value === value) : undefined;

  const triggerClassName = current?.className
    ? current.className
    : 'bg-background text-foreground border-dashed border-foreground/40 hover:border-foreground/70';
  const triggerLabel = current?.label ?? emptyLabel;
  const triggerIcon = current?.icon ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex"
        >
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 gap-0.5 cursor-pointer hover:opacity-80 transition-opacity',
              triggerClassName,
            )}
          >
            {triggerIcon}
            {triggerLabel}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 p-1"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (active) {
                    setOpen(false);
                    return;
                  }
                  onSelect(opt.value);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted"
              >
                {active ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
