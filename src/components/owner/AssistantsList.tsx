import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Pencil, UserX, UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAssistants, useDeleteAssistant, type Assistant } from '@/hooks/useAssistants';
import { AddAssistantModal } from './AddAssistantModal';
import { EditAssistantModal } from './EditAssistantModal';

export function AssistantsList() {
  const { data: assistants = [], isLoading } = useAssistants();
  const deleteAssistant = useDeleteAssistant();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [deletingAssistant, setDeletingAssistant] = useState<Assistant | null>(null);

  const handleDelete = async () => {
    if (deletingAssistant) {
      await deleteAssistant.mutateAsync(deletingAssistant.id);
      setDeletingAssistant(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAssistants = assistants.filter((a) => a.is_active);
  const inactiveAssistants = assistants.filter((a) => !a.is_active);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Asystenci</CardTitle>
            <CardDescription>
              Asystenci mają ograniczony dostęp tylko do wybranych grup kontaktów i funkcji Agent AI.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Dodaj asystenta
          </Button>
        </CardHeader>
        <CardContent>
          {assistants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak asystentów. Dodaj pierwszego asystenta klikając przycisk powyżej.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asystent</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Dyrektor</TableHead>
                  <TableHead>Grupy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Utworzony</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAssistants.map((assistant) => (
                  <TableRow key={assistant.id}>
                    <TableCell className="font-medium">{assistant.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{assistant.email}</TableCell>
                    <TableCell>{assistant.director?.full_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assistant.allowed_groups?.slice(0, 3).map((ga) => (
                          <Badge
                            key={ga.id}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: ga.group?.color || '#6366f1',
                              color: ga.group?.color || '#6366f1',
                            }}
                          >
                            {ga.group?.name}
                          </Badge>
                        ))}
                        {(assistant.allowed_groups?.length || 0) > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(assistant.allowed_groups?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Aktywny
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(assistant.created_at), 'd MMM yyyy', { locale: pl })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingAssistant(assistant)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAssistant(assistant)}
                        >
                          <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inactiveAssistants.map((assistant) => (
                  <TableRow key={assistant.id} className="opacity-50">
                    <TableCell className="font-medium">{assistant.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{assistant.email}</TableCell>
                    <TableCell>{assistant.director?.full_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {assistant.allowed_groups?.slice(0, 3).map((ga) => (
                          <Badge
                            key={ga.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {ga.group?.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Nieaktywny</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(assistant.created_at), 'd MMM yyyy', { locale: pl })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAssistant(assistant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddAssistantModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      
      <EditAssistantModal
        isOpen={!!editingAssistant}
        onClose={() => setEditingAssistant(null)}
        assistant={editingAssistant}
      />

      <AlertDialog open={!!deletingAssistant} onOpenChange={() => setDeletingAssistant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dezaktywować asystenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Asystent <strong>{deletingAssistant?.full_name}</strong> zostanie dezaktywowany
              i nie będzie mógł się logować. Możesz go ponownie aktywować w edycji.
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
