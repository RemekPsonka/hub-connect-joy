import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, X, Star, Loader2, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDefaultPositions,
  useCreateDefaultPosition,
  useDeleteDefaultPosition,
  useSetDefaultPosition,
  useUpdateDefaultPosition
} from '@/hooks/useDefaultPositions';

export function DefaultPositionsManager() {
  const [newPositionName, setNewPositionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { data: positions = [], isLoading } = useDefaultPositions();
  const createPosition = useCreateDefaultPosition();
  const deletePosition = useDeleteDefaultPosition();
  const setDefaultPosition = useSetDefaultPosition();
  const updatePosition = useUpdateDefaultPosition();

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) return;
    await createPosition.mutateAsync(newPositionName.trim());
    setNewPositionName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPosition();
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    try {
      await updatePosition.mutateAsync({ id: editingId, name: editingName.trim() });
      toast.success('Zaktualizowano stanowisko');
      cancelEditing();
    } catch (error) {
      toast.error('Błąd podczas aktualizacji');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Domyślne stanowiska
        </CardTitle>
        <CardDescription>
          Stanowiska sugerowane podczas importu i dodawania kontaktów
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Positions list */}
            <div className="space-y-2">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {editingId === position.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="h-8 flex-1 max-w-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          disabled={updatePosition.isPending}
                        >
                          {updatePosition.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium">{position.name}</span>
                        {position.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            domyślne
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  {editingId !== position.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(position.id, position.name)}
                        title="Edytuj nazwę"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!position.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultPosition.mutate(position.id)}
                          disabled={setDefaultPosition.isPending}
                          title="Ustaw jako domyślne"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePosition.mutate(position.id)}
                        disabled={deletePosition.isPending}
                        className="text-destructive hover:text-destructive"
                        title="Usuń stanowisko"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {positions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak zdefiniowanych stanowisk
                </p>
              )}
            </div>

            {/* Add new position */}
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Nazwa stanowiska..."
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                onClick={handleAddPosition}
                disabled={!newPositionName.trim() || createPosition.isPending}
              >
                {createPosition.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Stanowisko oznaczone gwiazdką będzie automatycznie wybierane dla nowych kontaktów bez określonego stanowiska
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
