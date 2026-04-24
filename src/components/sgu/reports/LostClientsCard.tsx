import { useState } from 'react';
import { RotateCcw, UserX, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useSGUTeamId } from '@/hooks/useSGUTeamId';
import { useLostClients, type LostClientRow } from '@/hooks/useLostClients';
import { RestoreToFunnelDialog } from './RestoreToFunnelDialog';

const INITIAL_LIMIT = 50;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function LostClientsCard() {
  const { sguTeamId } = useSGUTeamId();
  const { data, isLoading } = useLostClients(sguTeamId);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<LostClientRow | null>(null);

  if (!sguTeamId) return null;

  const total = data?.length ?? 0;
  const rows = expanded ? data ?? [] : (data ?? []).slice(0, INITIAL_LIMIT);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            Klienci utraceni
            {total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {total}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : total === 0 ? (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-muted-foreground">Brak utraconych klientów.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Powód utraty</TableHead>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead className="w-32 text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.contact_name}</div>
                        {row.company && (
                          <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {row.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <span
                          className="text-sm text-muted-foreground line-clamp-2"
                          title={row.lost_reason ?? ''}
                        >
                          {row.lost_reason ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {formatDate(row.lost_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(row)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Przywróć
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {total > INITIAL_LIMIT && (
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'Pokaż mniej' : `Pokaż wszystkie (${total})`}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selected && sguTeamId && (
        <RestoreToFunnelDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          rowId={selected.id}
          contactName={selected.contact_name}
          teamId={sguTeamId}
        />
      )}
    </>
  );
}