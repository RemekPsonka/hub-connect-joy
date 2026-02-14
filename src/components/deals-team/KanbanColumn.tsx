import { ReactNode, Children } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  icon: string;
  color: string;
  count: number;
  totalValue?: number;
  currency?: string;
  children: ReactNode;
  onAdd: () => void;
  addButtonLabel?: string;
  emptyMessage?: string;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDropTarget?: boolean;
  onHeaderClick?: () => void;
}

const colorClasses: Record<string, string> = {
  red: 'border-t-red-500',
  amber: 'border-t-amber-500',
  blue: 'border-t-blue-500',
  purple: 'border-t-purple-500',
  slate: 'border-t-slate-400',
};

export function KanbanColumn({
  title,
  icon,
  color,
  count,
  totalValue,
  currency = 'PLN',
  children,
  onAdd,
  addButtonLabel = '+ Dodaj',
  emptyMessage = 'Brak elementów',
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDropTarget = false,
  onHeaderClick,
}: KanbanColumnProps) {
  const hasChildren = Children.count(children) > 0;

  return (
    <div
      className={cn(
        `bg-muted/30 rounded-lg border border-t-2 flex flex-col min-h-[400px] max-h-[calc(100vh-280px)] transition-all`,
        colorClasses[color] || 'border-t-primary',
        isDropTarget && 'ring-2 ring-primary/50 bg-primary/5'
      )}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        className={cn(
          "p-3 border-b bg-muted/50",
          onHeaderClick && "cursor-pointer hover:bg-muted/80 transition-colors"
        )}
        onClick={onHeaderClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <h3 className="font-semibold text-sm">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
            {onHeaderClick && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        {totalValue !== undefined && totalValue > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {totalValue.toLocaleString('pl-PL')} {currency}
          </p>
        )}
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        {hasChildren ? (
          <div className="space-y-1">{children}</div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </ScrollArea>

      {/* Add button */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4 mr-1" />
          {addButtonLabel}
        </Button>
      </div>
    </div>
  );
}
