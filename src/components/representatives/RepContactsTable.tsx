import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RepresentativeContact, useRepresentativeContacts } from '@/hooks/useRepresentativeContacts';
import { SalesRepresentative } from '@/hooks/useRepresentatives';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  User, 
  Calendar, 
  Clock, 
  RotateCcw, 
  CheckCircle,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AssignContactModal } from './AssignContactModal';

interface RepContactsTableProps {
  assignments: RepresentativeContact[];
  isLoading: boolean;
  selectedRepId?: string;
  onSelectRepresentative: (id: string | undefined) => void;
  representatives: SalesRepresentative[];
}

export function RepContactsTable({
  assignments,
  isLoading,
  selectedRepId,
  onSelectRepresentative,
  representatives,
}: RepContactsTableProps) {
  const navigate = useNavigate();
  const { reclaimContact, extendDeadline, updateAssignment } = useRepresentativeContacts();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const getStatusBadge = (assignment: RepresentativeContact) => {
    const isOverdue = assignment.deadline_at && isPast(new Date(assignment.deadline_at));
    
    switch (assignment.status) {
      case 'active':
        if (isOverdue) {
          return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Przeterminowany</Badge>;
        }
        return <Badge variant="default">Aktywny</Badge>;
      case 'expired':
        return <Badge variant="secondary">Wygasły</Badge>;
      case 'reclaimed':
        return <Badge variant="outline">Odebrany</Badge>;
      case 'completed':
        return <Badge className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" />Zakończony</Badge>;
      default:
        return <Badge variant="secondary">{assignment.status}</Badge>;
    }
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return `${Math.abs(days)} dni po terminie`;
    if (days === 0) return 'Dziś';
    return `${days} dni`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Przekazane kontakty</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={selectedRepId || 'all'}
              onValueChange={(val) => onSelectRepresentative(val === 'all' ? undefined : val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Wszyscy przedstawiciele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy przedstawiciele</SelectItem>
                {representatives.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsAssignModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Przekaż kontakt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Brak przekazanych kontaktów</h3>
              <p className="text-muted-foreground max-w-md">
                Przekaż pierwszy kontakt do przedstawiciela, klikając "Przekaż kontakt".
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Przedstawiciel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Przypisano</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/contacts/${assignment.contact_id}`)}
                        className="text-left hover:underline"
                      >
                        <div className="font-medium">{assignment.contact?.full_name}</div>
                        {assignment.contact?.company && (
                          <div className="text-sm text-muted-foreground">{assignment.contact.company}</div>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{assignment.representative?.full_name}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment)}</TableCell>
                    <TableCell>
                      {assignment.deadline_at && (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(assignment.deadline_at), 'd MMM', { locale: pl })}
                          <span className="text-muted-foreground ml-1">
                            ({getDaysRemaining(assignment.deadline_at)})
                          </span>
                        </div>
                      )}
                      {assignment.extended_count > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Przedłużono {assignment.extended_count}x
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(assignment.assigned_at), 'd MMM yyyy', { locale: pl })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.status === 'active' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => extendDeadline.mutate({ id: assignment.id, additionalDays: 7 })}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Przedłuż o 7 dni
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => extendDeadline.mutate({ id: assignment.id, additionalDays: 14 })}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Przedłuż o 14 dni
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateAssignment.mutate({ id: assignment.id, status: 'completed' })}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Oznacz jako zakończone
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => reclaimContact.mutate(assignment.id)}
                              className="text-destructive"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Odbierz kontakt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AssignContactModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        representatives={representatives}
      />
    </>
  );
}
