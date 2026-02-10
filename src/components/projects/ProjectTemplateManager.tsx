import { useState } from 'react';
import { DataCard } from '@/components/ui/data-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Trash2, FileStack, ChevronDown, ChevronRight } from 'lucide-react';
import {
  useProjectTemplates,
  useCreateProjectTemplate,
  useDeleteProjectTemplate,
  type TemplateData,
  type TemplateSection,
  type TemplateTask,
} from '@/hooks/useProjectTemplates';

export function ProjectTemplateManager() {
  const { data: templates = [], isLoading } = useProjectTemplates();
  const createTemplate = useCreateProjectTemplate();
  const deleteTemplate = useDeleteProjectTemplate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    setSections([...sections, { name: newSectionName.trim(), color: '#7C3AED', tasks: [] }]);
    setNewSectionName('');
  };

  const handleRemoveSection = (idx: number) => {
    setSections(sections.filter((_, i) => i !== idx));
  };

  const handleAddTask = (sectionIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].tasks.push({ title: '', priority: 'medium' });
    setSections(updated);
  };

  const handleUpdateTask = (sectionIdx: number, taskIdx: number, field: keyof TemplateTask, value: string) => {
    const updated = [...sections];
    (updated[sectionIdx].tasks[taskIdx] as any)[field] = value;
    setSections(updated);
  };

  const handleRemoveTask = (sectionIdx: number, taskIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].tasks = updated[sectionIdx].tasks.filter((_, i) => i !== taskIdx);
    setSections(updated);
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;
    const templateData: TemplateData = { sections: sections.filter((s) => s.name) };
    await createTemplate.mutateAsync({ name: templateName.trim(), templateData });
    setTemplateName('');
    setSections([]);
    setIsDialogOpen(false);
  };

  return (
    <DataCard
      title="Szablony projektów"
      action={
        <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nowy szablon
        </Button>
      }
    >
      {templates.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileStack}
          title="Brak szablonów"
          description="Utwórz szablon z predefiniowanymi sekcjami i zadaniami."
          action={{ label: 'Utwórz szablon', onClick: () => setIsDialogOpen(true), icon: Plus }}
        />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => {
            const td = t.template_data as unknown as TemplateData | null;
            const isExpanded = expandedTemplate === t.id;
            return (
              <div key={t.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-2 text-sm font-medium"
                    onClick={() => setExpandedTemplate(isExpanded ? null : t.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {t.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {td?.sections?.length || 0} sekcji
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usunąć szablon?</AlertDialogTitle>
                          <AlertDialogDescription>Ta akcja jest nieodwracalna.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTemplate.mutate(t.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {isExpanded && td?.sections && (
                  <div className="mt-3 space-y-2 pl-6">
                    {td.sections.map((s, si) => (
                      <div key={si}>
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </p>
                        {s.tasks.map((task, ti) => (
                          <p key={ti} className="text-xs text-muted-foreground ml-4 py-0.5">
                            • {task.title} {task.priority && task.priority !== 'medium' && `(${task.priority})`}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create template dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nowy szablon projektu</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nazwa szablonu</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="np. Projekt marketingowy"
              />
            </div>

            <div className="space-y-2">
              <Label>Sekcje</Label>
              <div className="flex gap-2">
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                  placeholder="Nazwa sekcji..."
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8" onClick={handleAddSection}>
                  Dodaj
                </Button>
              </div>

              {sections.map((section, si) => (
                <div key={si} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{section.name}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleAddTask(si)}>
                        <Plus className="h-3 w-3 mr-1" /> Zadanie
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => handleRemoveSection(si)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {section.tasks.map((task, ti) => (
                    <div key={ti} className="flex gap-2 items-center pl-2">
                      <Input
                        className="h-7 text-xs flex-1"
                        value={task.title}
                        onChange={(e) => handleUpdateTask(si, ti, 'title', e.target.value)}
                        placeholder="Tytuł zadania..."
                      />
                      <select
                        className="h-7 text-xs border rounded px-1 bg-background"
                        value={task.priority || 'medium'}
                        onChange={(e) => handleUpdateTask(si, ti, 'priority', e.target.value)}
                      >
                        <option value="low">Niski</option>
                        <option value="medium">Średni</option>
                        <option value="high">Wysoki</option>
                      </select>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleRemoveTask(si, ti)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={!templateName.trim() || createTemplate.isPending}>
              Utwórz szablon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DataCard>
  );
}
