import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamMembers } from '@/hooks/useDealsTeamMembers';

interface TeamAdminTabProps {
  teamId: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  partner: 'Partner',
  representative: 'Przedstawiciel',
  member: 'Członek',
  leader: 'Lider',
};

export function TeamAdminTab({ teamId }: TeamAdminTabProps) {
  const { data: members = [], isLoading } = useTeamMembers(teamId ?? undefined);

  if (!teamId) {
    return <Alert><AlertDescription>Brak skonfigurowanego zespołu SGU.</AlertDescription></Alert>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Zespół SGU</CardTitle>
        <Button size="sm" onClick={() => toast.info('Sprint SGU-09')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Zaproś przedstawiciela
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak członków zespołu.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Członek</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rola</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const name = m.director?.full_name ?? '—';
                  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
                          <span className="font-medium">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.director?.email ?? '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{ROLE_LABEL[m.role] ?? m.role}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Badge variant={m.is_active ? 'default' : 'outline'}>
                          {m.is_active ? 'Aktywny' : 'Nieaktywny'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
