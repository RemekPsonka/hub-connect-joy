import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, X, Star, Loader2 } from 'lucide-react';
import {
  useDefaultPositions,
  useCreateDefaultPosition,
  useDeleteDefaultPosition,
  useSetDefaultPosition
} from '@/hooks/useDefaultPositions';

export function DefaultPositionsManager() {
  const [newPositionName, setNewPositionName] = useState('');
  const { data: positions = [], isLoading } = useDefaultPositions();
  const createPosition = useCreateDefaultPosition();
  const deletePosition = useDeleteDefaultPosition();
  const setDefaultPosition = useSetDefaultPosition();

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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{position.name}</span>
                    {position.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        domyślne
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
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
