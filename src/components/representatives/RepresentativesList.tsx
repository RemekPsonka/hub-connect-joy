import { useState } from 'react';
import { SalesRepresentative, useRepresentatives } from '@/hooks/useRepresentatives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical, User, Mail, Crown, Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface RepresentativesListProps {
  representatives: SalesRepresentative[];
  isLoading: boolean;
  onSelectRepresentative: (id: string) => void;
}

export function RepresentativesList({ 
  representatives, 
  isLoading,
  onSelectRepresentative,
}: RepresentativesListProps) {
  const { updateRepresentative, deleteRepresentative } = useRepresentatives();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRepresentative | null>(null);

  const handleDelete = (rep: SalesRepresentative) => {
    setSelectedRep(rep);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRep) {
      deleteRepresentative.mutate(selectedRep.id);
    }
    setDeleteDialogOpen(false);
    setSelectedRep(null);
  };

  const toggleActive = (rep: SalesRepresentative) => {
    updateRepresentative.mutate({
      id: rep.id,
      is_active: !rep.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (representatives.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Brak przedstawicieli</h3>
          <p className="text-muted-foreground max-w-md">
            Dodaj pierwszego przedstawiciela handlowego lub ambasadora, aby zacząć przekazywać kontakty.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {representatives.map((rep) => (
          <Card 
            key={rep.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${!rep.is_active ? 'opacity-60' : ''}`}
            onClick={() => onSelectRepresentative(rep.id)}
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">{rep.full_name}</CardTitle>
                {!rep.is_active && (
                  <Badge variant="secondary" className="text-xs">Nieaktywny</Badge>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleActive(rep); }}>
                    {rep.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Dezaktywuj
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Aktywuj
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); handleDelete(rep); }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {rep.email}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rep.role_type === 'ambassador' ? 'default' : 'secondary'}>
                  {rep.role_type === 'ambassador' ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      Ambasador
                    </>
                  ) : (
                    'Przedstawiciel'
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Dodany: {format(new Date(rep.created_at), 'd MMM yyyy', { locale: pl })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć przedstawiciela?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć <strong>{selectedRep?.full_name}</strong>? 
              Ta operacja jest nieodwracalna. Wszystkie przypisane kontakty zostaną zwrócone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
