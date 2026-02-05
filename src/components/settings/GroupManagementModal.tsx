import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  useContactGroups, 
  useCreateContactGroup, 
  useUpdateContactGroup, 
  useDeleteContactGroup,
  type ContactGroup 
} from '@/hooks/useContactGroups';
import { Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#64748b', // Slate
  '#1e293b', // Dark
];

export function GroupManagementModal({ isOpen, onClose }: GroupManagementModalProps) {
  const { data: groups = [], isLoading } = useContactGroups();
  const createGroup = useCreateContactGroup();
  const updateGroup = useUpdateContactGroup();
  const deleteGroup = useDeleteContactGroup();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<ContactGroup | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
      setColor(editingGroup.color || PRESET_COLORS[0]);
    } else {
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
    }
  }, [editingGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    if (editingGroup) {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
    } else {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        color,
        sort_order: groups.length,
      });
    }

    setIsFormOpen(false);
    setEditingGroup(null);
  };

  const handleEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmGroup) {
      await deleteGroup.mutateAsync(deleteConfirmGroup.id);
      setDeleteConfirmGroup(null);
    }
  };

  const handleOpenForm = () => {
    setEditingGroup(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setIsFormOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zarządzanie grupami kontaktów</DialogTitle>
            <DialogDescription>
              Twórz, edytuj i usuwaj grupy do kategoryzacji kontaktów
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new group button */}
            {!isFormOpen && (
              <Button onClick={handleOpenForm} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj nową grupę
              </Button>
            )}

            {/* Form */}
            {isFormOpen && (
              <Card className="border-primary">
                <CardContent className="p-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nazwa grupy *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="np. VIP, Klienci, Partnerzy"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Opis (opcjonalnie)</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Krótki opis grupy..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Kolor</Label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((presetColor) => (
                          <button
                            key={presetColor}
                            type="button"
                            onClick={() => setColor(presetColor)}
                            className={`w-8 h-8 rounded-full transition-all ${
                              color === presetColor
                                ? 'ring-2 ring-offset-2 ring-primary scale-110'
                                : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: presetColor }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={createGroup.isPending || updateGroup.isPending}>
                        {(createGroup.isPending || updateGroup.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingGroup ? 'Zapisz zmiany' : 'Utwórz grupę'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsFormOpen(false);
                          setEditingGroup(null);
                        }}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Groups list */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Brak grup. Kliknij "Dodaj nową grupę" aby utworzyć pierwszą.
                </div>
              ) : (
                groups.map((group) => (
                  <Card key={group.id} className="group hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: group.color || PRESET_COLORS[0] }}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{group.name}</span>
                          {group.is_system && (
                            <Badge variant="secondary" className="text-xs">
                              Systemowa
                            </Badge>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {group.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                          disabled={group.is_system ?? false}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmGroup(group)}
                          disabled={group.is_system ?? false}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmGroup} onOpenChange={() => setDeleteConfirmGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę grupę?</AlertDialogTitle>
            <AlertDialogDescription>
              Grupa "{deleteConfirmGroup?.name}" zostanie usunięta. 
              Kontakty przypisane do tej grupy nie zostaną usunięte, ale stracą przypisanie do grupy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Usuń grupę'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
