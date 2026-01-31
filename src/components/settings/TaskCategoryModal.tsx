import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateTaskCategory,
  useUpdateTaskCategory,
  type TaskCategory,
  type WorkflowStep,
} from '@/hooks/useTaskCategories';

interface TaskCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: TaskCategory | null;
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export function TaskCategoryModal({ open, onOpenChange, category }: TaskCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [visibilityType, setVisibilityType] = useState<'individual' | 'team' | 'shared'>('individual');
  const [isKpi, setIsKpi] = useState(false);
  const [kpiTarget, setKpiTarget] = useState<number>(100);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [isActive, setIsActive] = useState(true);

  const createCategory = useCreateTaskCategory();
  const updateCategory = useUpdateTaskCategory();
  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
      setColor(category.color);
      setVisibilityType(category.visibility_type);
      setIsKpi(category.is_kpi);
      setKpiTarget(category.kpi_target || 100);
      setWorkflowSteps(category.workflow_steps?.steps || []);
      setIsActive(category.is_active);
    } else {
      // Reset form
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
      setVisibilityType('individual');
      setIsKpi(false);
      setKpiTarget(100);
      setWorkflowSteps([]);
      setIsActive(true);
    }
  }, [category, open]);

  const addWorkflowStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: '',
      order: workflowSteps.length + 1,
      required: true,
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const updateWorkflowStep = (index: number, updates: Partial<WorkflowStep>) => {
    const updated = [...workflowSteps];
    updated[index] = { ...updated[index], ...updates };
    setWorkflowSteps(updated);
  };

  const removeWorkflowStep = (index: number) => {
    const updated = workflowSteps.filter((_, i) => i !== index);
    // Reorder
    updated.forEach((step, i) => {
      step.order = i + 1;
    });
    setWorkflowSteps(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Nazwa kategorii jest wymagana');
      return;
    }

    // Validate workflow steps if any
    const validSteps = workflowSteps.filter(s => s.name.trim());
    
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        visibility_type: visibilityType,
        is_kpi: isKpi,
        kpi_target: isKpi ? kpiTarget : undefined,
        workflow_steps: validSteps.length > 0 ? {
          steps: validSteps,
          allow_snooze: true,
          snooze_creates_ping: true,
        } : undefined,
        is_active: isActive,
      };

      if (isEditing && category) {
        await updateCategory.mutateAsync({ id: category.id, ...data });
        toast.success('Kategoria została zaktualizowana');
      } else {
        await createCategory.mutateAsync(data);
        toast.success('Kategoria została utworzona');
      }

      onOpenChange(false);
    } catch (error) {
      toast.error('Wystąpił błąd');
      console.error(error);
    }
  };

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edytuj kategorię' : 'Nowa kategoria zadań'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Top 100 klientów"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcjonalny opis kategorii"
              rows={2}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Kolor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Visibility Type */}
          <div className="space-y-3">
            <Label>Typ widoczności</Label>
            <RadioGroup
              value={visibilityType}
              onValueChange={(v) => setVisibilityType(v as 'individual' | 'team' | 'shared')}
              className="space-y-2"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="individual" id="individual" className="mt-1" />
                <div>
                  <Label htmlFor="individual" className="cursor-pointer font-medium">
                    Indywidualna
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Tylko twórca widzi zadania z tej kategorii
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="team" id="team" className="mt-1" />
                <div>
                  <Label htmlFor="team" className="cursor-pointer font-medium">
                    Zespołowa
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Wszyscy w firmie widzą zadania z tej kategorii
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="shared" id="shared" className="mt-1" />
                <div>
                  <Label htmlFor="shared" className="cursor-pointer font-medium">
                    Współdzielona
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Twórca wybiera widoczność przy tworzeniu zadania
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* KPI */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-kpi"
                checked={isKpi}
                onCheckedChange={(checked) => setIsKpi(!!checked)}
              />
              <Label htmlFor="is-kpi" className="cursor-pointer">
                Ta kategoria to KPI do monitorowania
              </Label>
            </div>
            {isKpi && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="kpi-target">Cel (liczba zadań)</Label>
                <Input
                  id="kpi-target"
                  type="number"
                  min={1}
                  value={kpiTarget}
                  onChange={(e) => setKpiTarget(parseInt(e.target.value) || 100)}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Kroki workflow</Label>
              <Button type="button" variant="outline" size="sm" onClick={addWorkflowStep}>
                <Plus className="h-4 w-4 mr-1" />
                Dodaj krok
              </Button>
            </div>
            {workflowSteps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak kroków. Dodaj kroki aby śledzić postęp zadań.
              </p>
            ) : (
              <div className="space-y-2">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <Input
                      value={step.name}
                      onChange={(e) => updateWorkflowStep(index, { name: e.target.value })}
                      placeholder="Nazwa kroku"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWorkflowStep(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active status for editing */}
          {isEditing && (
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Checkbox
                id="is-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(!!checked)}
              />
              <Label htmlFor="is-active" className="cursor-pointer">
                Kategoria aktywna
              </Label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Zapisz' : 'Utwórz'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
