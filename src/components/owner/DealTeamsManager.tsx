import { useState } from 'react';
import { Plus, Users2, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useDealTeams, useDeleteDealTeam, DealTeam } from '@/hooks/useDealTeams';
import { DealTeamModal } from './DealTeamModal';

export function DealTeamsManager() {
  const { data: teams, isLoading } = useDealTeams();
  const deleteTeam = useDeleteDealTeam();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<DealTeam | null>(null);

  const handleEdit = (team: DealTeam) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTeam.mutateAsync(id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Zespoły deals
          </CardTitle>
          <CardDescription>
            Zarządzaj zespołami współpracy dla deals. Każdy zespół widzi tylko swoje deals.
          </CardDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nowy zespół
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !teams || teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Brak zespołów</p>
            <p className="text-sm">Utwórz zespół, aby kontrolować widoczność deals</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zespół</TableHead>
                <TableHead>Członkowie</TableHead>
                <TableHead>Opis</TableHead>
                <TableHead className="w-[100px]">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-medium">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {team.members?.map((member) => (
                        <Badge key={member.id} variant="secondary" className="text-xs">
                          {member.director?.full_name || 'Nieznany'}
                        </Badge>
                      ))}
                      {(!team.members || team.members.length === 0) && (
                        <span className="text-muted-foreground text-sm">Brak członków</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {team.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(team)}
                        title="Edytuj zespół"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Usuń zespół"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usuń zespół</AlertDialogTitle>
                            <AlertDialogDescription>
                              Czy na pewno chcesz usunąć zespół <strong>{team.name}</strong>?
                              Deals przypisane do tego zespołu stracą powiązanie.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(team.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <DealTeamModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        team={editingTeam}
      />
    </Card>
  );
}
