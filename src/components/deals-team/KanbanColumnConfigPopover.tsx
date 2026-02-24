import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { KanbanColumnVisibility } from '@/hooks/useKanbanColumnSettings';
import { KANBAN_COLUMN_LABELS } from '@/config/pipelineStages';

const COLUMN_LABELS = KANBAN_COLUMN_LABELS as Record<keyof KanbanColumnVisibility, string>;

interface KanbanColumnConfigPopoverProps {
  columns: KanbanColumnVisibility;
  onToggle: (updates: Partial<KanbanColumnVisibility>) => void;
}

export function KanbanColumnConfigPopover({ columns, onToggle }: KanbanColumnConfigPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
          <Settings2 className="h-3.5 w-3.5" />
          Kolumny
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Widoczne kolumny</p>
          {(Object.keys(COLUMN_LABELS) as Array<keyof KanbanColumnVisibility>).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={columns[key]}
                onCheckedChange={(checked) => onToggle({ [key]: !!checked })}
              />
              {COLUMN_LABELS[key]}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
