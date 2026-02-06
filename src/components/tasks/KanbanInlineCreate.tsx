import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useCreateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface KanbanInlineCreateProps {
  status: string;
  projectId?: string;
}

export function KanbanInlineCreate({ status, projectId }: KanbanInlineCreateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({
        task: {
          title: title.trim(),
          status,
          priority: 'medium',
          task_type: 'standard',
          project_id: projectId || null,
        },
      });
      setTitle('');
      setIsOpen(false);
      toast.success('Zadanie dodane');
    } catch {
      toast.error('Błąd');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Dodaj zadanie
      </button>
    );
  }

  return (
    <div className="space-y-2 bg-card rounded-lg p-2.5 border border-border shadow-sm">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tytuł zadania..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') { setIsOpen(false); setTitle(''); }
        }}
        autoFocus
        className="h-8 text-sm"
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || createTask.isPending} className="h-7 text-xs flex-1">
          {createTask.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Dodaj'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setIsOpen(false); setTitle(''); }} className="h-7 text-xs">
          Anuluj
        </Button>
      </div>
    </div>
  );
}
