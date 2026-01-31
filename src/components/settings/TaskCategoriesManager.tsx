import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Plus, Pencil, Trash2, Users, User, Share2, Target, GitBranch } from 'lucide-react';
import { useAllTaskCategories, useDeleteTaskCategory, type TaskCategory } from '@/hooks/useTaskCategories';
import { TaskCategoryModal } from './TaskCategoryModal';
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
} from '@/components/ui/alert-dialog';

export function TaskCategoriesManager() {
  const { data: categories = [], isLoading } = useAllTaskCategories();
  const deleteCategory = useDeleteTaskCategory();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TaskCategory | null>(null);

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    
    try {
      await deleteCategory.mutateAsync(deletingCategory.id);
      toast.success('Kategoria została dezaktywowana');
    } catch (error) {
      toast.error('Nie udało się usunąć kategorii');
    } finally {
      setDeletingCategory(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const getVisibilityIcon = (type: string) => {
    switch (type) {
      case 'individual': return <User className="h-3 w-3" />;
      case 'team': return <Users className="h-3 w-3" />;
      case 'shared': return <Share2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const getVisibilityLabel = (type: string) => {
    switch (type) {
      case 'individual': return 'Indywidualna';
      case 'team': return 'Zespołowa';
      case 'shared': return 'Współdzielona';
      default: return type;
    }
  };

  const activeCategories = categories.filter(c => c.is_active);
  const inactiveCategories = categories.filter(c => !c.is_active);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Kategorie zadań
              </CardTitle>
              <CardDescription>
                Definiuj kategorie z workflow do monitorowania postępów i KPI
              </CardDescription>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj kategorię
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
          ) : activeCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak zdefiniowanych kategorii. Kliknij "Dodaj kategorię" aby utworzyć pierwszą.
            </div>
          ) : (
            <div className="space-y-3">
              {activeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{category.name}</span>
                        {category.is_kpi && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Target className="h-3 w-3" />
                            KPI: {category.kpi_target}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          {getVisibilityIcon(category.visibility_type)}
                          {getVisibilityLabel(category.visibility_type)}
                        </span>
                        {category.workflow_steps?.steps?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {category.workflow_steps.steps.length} kroków
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingCategory(category)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inactiveCategories.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Nieaktywne kategorie ({inactiveCategories.length})
              </h4>
              <div className="space-y-2">
                {inactiveCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30"
                  >
                    <span className="text-muted-foreground">{category.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      Przywróć
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskCategoryModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        category={editingCategory}
      />

      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dezaktywować kategorię?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategoria "{deletingCategory?.name}" zostanie dezaktywowana. 
              Istniejące zadania z tą kategorią pozostaną bez zmian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Dezaktywuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
