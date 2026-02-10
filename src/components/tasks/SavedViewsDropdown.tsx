import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { useSavedTaskViews, useCreateSavedView, useDeleteSavedView } from '@/hooks/useSavedTaskViews';
import type { TasksFilters } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface SavedViewsDropdownProps {
  currentFilters: TasksFilters;
  onApplyFilters: (filters: TasksFilters) => void;
}

export function SavedViewsDropdown({ currentFilters, onApplyFilters }: SavedViewsDropdownProps) {
  const { data: views = [] } = useSavedTaskViews();
  const createView = useCreateSavedView();
  const deleteView = useDeleteSavedView();
  const [isNaming, setIsNaming] = useState(false);
  const [viewName, setViewName] = useState('');

  const handleSave = async () => {
    if (!viewName.trim()) return;
    try {
      await createView.mutateAsync({ name: viewName.trim(), filters: currentFilters });
      setViewName('');
      setIsNaming(false);
      toast.success('Widok zapisany');
    } catch {
      toast.error('Błąd zapisu');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteView.mutateAsync(id);
    toast.success('Widok usunięty');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          Widoki
          {views.length > 0 && (
            <span className="text-xs bg-muted px-1.5 rounded-full">{views.length}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {views.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => onApplyFilters(view.filters)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{view.name}</span>
            <button
              onClick={(e) => handleDelete(e, view.id)}
              className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </DropdownMenuItem>
        ))}
        {views.length > 0 && <DropdownMenuSeparator />}
        {isNaming ? (
          <div className="px-2 py-1.5 flex gap-1">
            <Input
              className="h-7 text-sm"
              placeholder="Nazwa widoku..."
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <Button size="sm" className="h-7" onClick={handleSave}>OK</Button>
          </div>
        ) : (
          <DropdownMenuItem onClick={() => setIsNaming(true)}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            Zapisz aktualny widok
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
