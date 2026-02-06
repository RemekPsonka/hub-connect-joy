import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { History, UserPlus, UserMinus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useRoleAuditLog, RoleAuditEntry } from '@/hooks/useRoleAuditLog';
import { AppRole } from '@/hooks/useOwnerPanel';

const roleLabels: Record<AppRole, string> = {
  owner: 'Właściciel',
  admin: 'Administrator',
  sgu: 'SGU',
  director: 'Dyrektor',
};

const actionLabels: Record<RoleAuditEntry['action'], string> = {
  role_added: 'Dodano rolę',
  role_removed: 'Usunięto rolę',
  role_changed: 'Zmieniono rolę',
};

const actionIcons: Record<RoleAuditEntry['action'], React.ReactNode> = {
  role_added: <UserPlus className="h-4 w-4 text-primary" />,
  role_removed: <UserMinus className="h-4 w-4 text-destructive" />,
  role_changed: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
};

export function RoleAuditLog() {
  const { data: entries = [], isLoading, error } = useRoleAuditLog();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia zmian ról
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia zmian ról
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-4">
            Błąd ładowania historii zmian
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia zmian ról
        </CardTitle>
        <CardDescription>
          Ostatnie 50 zmian uprawnień użytkowników
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Brak historii zmian ról
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Użytkownik</TableHead>
                <TableHead>Akcja</TableHead>
                <TableHead>Zmiana</TableHead>
                <TableHead>Zmienione przez</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {entry.target_user?.full_name || 'Nieznany użytkownik'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.target_user?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {actionIcons[entry.action]}
                      <span className="text-sm">{actionLabels[entry.action]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.old_role && (
                        <Badge variant="outline" className="line-through opacity-60">
                          {roleLabels[entry.old_role]}
                        </Badge>
                      )}
                      {entry.old_role && entry.new_role && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      {entry.new_role && (
                        <Badge variant="secondary">
                          {roleLabels[entry.new_role]}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.changed_by_user?.full_name || 'System'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
