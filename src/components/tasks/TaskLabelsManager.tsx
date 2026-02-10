import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tags, Plus, X, Loader2, Check } from 'lucide-react';
import {
  useTaskLabels,
  useTaskLabelAssignments,
  useCreateTaskLabel,
  useAssignTaskLabel,
  useUnassignTaskLabel,
} from '@/hooks/useTaskLabels';
import { toast } from 'sonner';

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#64748b',
];

interface TaskLabelsManagerProps {
  taskId: string;
}

export function TaskLabelsManager({ taskId }: TaskLabelsManagerProps) {
  const { data: allLabels = [] } = useTaskLabels();
  const { data: assignments = [] } = useTaskLabelAssignments(taskId);
  const createLabel = useCreateTaskLabel();
  const assignLabel = useAssignTaskLabel();
  const unassignLabel = useUnassignTaskLabel();

  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[4]);
  const [isCreating, setIsCreating] = useState(false);

  const assignedLabelIds = new Set(assignments.map((a) => a.label_id));

  const handleToggleLabel = async (labelId: string) => {
    try {
      if (assignedLabelIds.has(labelId)) {
        await unassignLabel.mutateAsync({ taskId, labelId });
      } else {
        await assignLabel.mutateAsync({ taskId, labelId });
      }
    } catch {
      toast.error('Nie udało się zmienić etykiety');
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const label = await createLabel.mutateAsync({ name: newLabelName.trim(), color: newLabelColor });
      await assignLabel.mutateAsync({ taskId, labelId: label.id });
      setNewLabelName('');
      setIsCreating(false);
    } catch {
      toast.error('Nie udało się utworzyć etykiety');
    }
  };

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">Etykiety</h4>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Wybierz etykietę</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {allLabels.map((label) => (
                    <button
                      key={label.id}
                      className="flex items-center gap-2 w-full p-1.5 rounded-md hover:bg-muted/50 text-sm"
                      onClick={() => handleToggleLabel(label.id)}
                    >
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="flex-1 text-left">{label.name}</span>
                      {assignedLabelIds.has(label.id) && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>

                <Separator />

                {isCreating ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nazwa etykiety"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-1 flex-wrap">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c}
                          className="h-5 w-5 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: c === newLabelColor ? 'hsl(var(--foreground))' : 'transparent',
                          }}
                          onClick={() => setNewLabelColor(c)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 flex-1 text-xs" onClick={handleCreateLabel} disabled={createLabel.isPending}>
                        {createLabel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Utwórz'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsCreating(false)}>
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs justify-start"
                    onClick={() => setIsCreating(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Nowa etykieta
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {assignments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((a) => (
              <Badge
                key={a.id}
                variant="outline"
                className="text-xs px-2 py-0.5 gap-1"
                style={{ borderColor: a.label.color, color: a.label.color }}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: a.label.color }} />
                {a.label.name}
                <button
                  onClick={() => handleToggleLabel(a.label_id)}
                  className="hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
