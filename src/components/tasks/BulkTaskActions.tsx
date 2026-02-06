import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import { useBulkUpdateTasks, useBulkDeleteTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BulkTaskActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkTaskActions({ selectedIds, onClearSelection }: BulkTaskActionsProps) {
  const bulkUpdate = useBulkUpdateTasks();
  const bulkDelete = useBulkDeleteTasks();

  const count = selectedIds.length;
  if (count === 0) return null;

  const handleStatusChange = async (status: string) => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, updates: { status } });
      toast.success(`Zaktualizowano ${count} zadań`);
      onClearSelection();
    } catch {
      toast.error('Błąd podczas aktualizacji');
    }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, updates: { priority } });
      toast.success(`Zaktualizowano priorytet ${count} zadań`);
      onClearSelection();
    } catch {
      toast.error('Błąd podczas aktualizacji');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(selectedIds);
      toast.success(`Usunięto ${count} zadań`);
      onClearSelection();
    } catch {
      toast.error('Błąd podczas usuwania');
    }
  };

  const isLoading = bulkUpdate.isPending || bulkDelete.isPending;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium text-primary">
        {count} zaznaczonych
      </span>

      <Select onValueChange={handleStatusChange} disabled={isLoading}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Zmień status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Oczekujące</SelectItem>
          <SelectItem value="in_progress">W trakcie</SelectItem>
          <SelectItem value="completed">Zakończone</SelectItem>
        </SelectContent>
      </Select>

      <Select onValueChange={handlePriorityChange} disabled={isLoading}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Zmień priorytet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Niski</SelectItem>
          <SelectItem value="medium">Średni</SelectItem>
          <SelectItem value="high">Wysoki</SelectItem>
          <SelectItem value="urgent">Pilny</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStatusChange('completed')}
        disabled={isLoading}
        className="h-8 text-xs gap-1"
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
        Zakończ wszystkie
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={isLoading} className="h-8 text-xs gap-1">
            <Trash2 className="h-3 w-3" /> Usuń
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć {count} zadań?</AlertDialogTitle>
            <AlertDialogDescription>Ta akcja jest nieodwracalna.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 ml-auto">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
