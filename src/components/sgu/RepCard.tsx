import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Settings, UserX, UserCheck } from 'lucide-react';
import type { SGURepresentativeProfile } from '@/types/sgu-representative';

interface RepCardProps {
  rep: SGURepresentativeProfile;
  onOpen: (rep: SGURepresentativeProfile) => void;
  onDeactivate: (rep: SGURepresentativeProfile) => void;
  onReactivate: (rep: SGURepresentativeProfile) => void;
}

export function RepCard({ rep, onOpen, onDeactivate, onReactivate }: RepCardProps) {
  const initials = `${rep.first_name?.[0] ?? ''}${rep.last_name?.[0] ?? ''}`.toUpperCase();
  const isOnboarded = !!rep.onboarded_at;

  return (
    <TableRow className="cursor-pointer" onClick={() => onOpen(rep)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {initials}
          </div>
          <div>
            <div className="font-medium">{rep.first_name} {rep.last_name}</div>
            <div className="text-xs text-muted-foreground">{rep.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{rep.region ?? '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{rep.phone ?? '—'}</TableCell>
      <TableCell>
        {rep.active ? (
          isOnboarded ? (
            <Badge variant="default">Aktywny</Badge>
          ) : (
            <Badge variant="secondary">Zaproszony</Badge>
          )
        ) : (
          <Badge variant="outline">Dezaktywowany</Badge>
        )}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(rep)}>
              <Settings className="h-4 w-4 mr-2" />
              Ustawienia
            </DropdownMenuItem>
            {rep.active ? (
              <DropdownMenuItem onClick={() => onDeactivate(rep)} className="text-destructive">
                <UserX className="h-4 w-4 mr-2" />
                Dezaktywuj
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onReactivate(rep)}>
                <UserCheck className="h-4 w-4 mr-2" />
                Reaktywuj
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
