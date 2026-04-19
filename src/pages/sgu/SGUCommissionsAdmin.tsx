import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSGUAccess } from '@/hooks/useSGUAccess';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SplitRow {
  id: string;
  role_key: string;
  recipient_user_id: string | null;
  share_pct: number;
  active_from: string;
  active_to: string | null;
  notes: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  sgu_company: 'SGU (firma)',
  adam: 'Adam',
  pawel: 'Paweł',
  remek: 'Remek',
};

export default function SGUCommissionsAdmin() {
  const { isPartner } = useSGUAccess();
  const { director } = useAuth();
  const canEdit = isPartner || !!director;

  const { data: splits = [], isLoading } = useQuery<SplitRow[]>({
    queryKey: ['sgu-commission-base-split'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_base_split')
        .select('id, role_key, recipient_user_id, share_pct, active_from, active_to, notes')
        .order('active_to', { ascending: true, nullsFirst: true })
        .order('role_key');
      if (error) throw error;
      return (data ?? []) as SplitRow[];
    },
  });

  const activeSplits = useMemo(() => splits.filter((s) => s.active_to === null), [splits]);
  const archivedSplits = useMemo(() => splits.filter((s) => s.active_to !== null), [splits]);

  const sumActive = useMemo(
    () => activeSplits.reduce((s, r) => s + Number(r.share_pct), 0),
    [activeSplits],
  );
  const sumWarning = Math.abs(sumActive - 100) > 0.01;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Konfiguracja prowizji — split bazowy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aktywny split definiuje udziały bazowe (Case A — bez modyfikatorów). Przy obecności
            modyfikatorów <code>has_handling</code> lub <code>representative_user_id</code> trigger
            stosuje warianty B/C/D zgodnie ze specyfikacją Sprint SGU-03.
          </p>

          {sumWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Suma udziałów ≠ 100%</AlertTitle>
              <AlertDescription>
                Aktualna suma: {sumActive.toFixed(2)}%. Wpisy prowizyjne będą miały błędny rozdział.
                Skoryguj rekordy w tabeli <code>commission_base_split</code>.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activeSplits.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Brak aktywnego splita</AlertTitle>
              <AlertDescription>
                Trigger zwróci błąd przy próbie generowania prowizji.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rola</TableHead>
                    <TableHead>Odbiorca</TableHead>
                    <TableHead className="text-right">Udział</TableHead>
                    <TableHead>Aktywny od</TableHead>
                    <TableHead>Notatka</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSplits.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {ROLE_LABELS[row.role_key] ?? row.role_key}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.recipient_user_id ? row.recipient_user_id.slice(0, 8) + '…' : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {row.share_pct}%
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(row.active_from).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Suma</span>
                <Badge variant={sumWarning ? 'destructive' : 'secondary'} className="font-semibold">
                  {sumActive.toFixed(2)}%
                </Badge>
              </div>
            </div>
          )}

          {!canEdit && (
            <p className="text-xs text-muted-foreground italic">
              Edycja dostępna dla partnera SGU lub dyrektora. Skontaktuj się z administratorem.
            </p>
          )}
        </CardContent>
      </Card>

      {archivedSplits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historia wersji</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rola</TableHead>
                  <TableHead className="text-right">Udział</TableHead>
                  <TableHead>Okres</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedSplits.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{ROLE_LABELS[row.role_key] ?? row.role_key}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.share_pct}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(row.active_from).toLocaleDateString('pl-PL')} —{' '}
                      {row.active_to
                        ? new Date(row.active_to).toLocaleDateString('pl-PL')
                        : 'aktywny'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
