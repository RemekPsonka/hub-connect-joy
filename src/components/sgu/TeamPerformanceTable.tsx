import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { SGUTeamPerformanceRow } from '@/hooks/useSGUTeamPerformance';

// TODO (SGU-08): przenieść do commission_base_split.weekly_target_gr lub sgu_targets
const WEEKLY_TARGET_GR = 50_000_00; // 50 000 PLN w groszach

const formatPLN = (gr: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(gr / 100);

interface Props {
  data: SGUTeamPerformanceRow[];
  isLoading?: boolean;
}

export function TeamPerformanceTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-muted/20">
        Brak danych dla wybranego tygodnia.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Osoba</TableHead>
            <TableHead className="text-right">Polisy</TableHead>
            <TableHead className="text-right">Booked</TableHead>
            <TableHead className="text-right">Collected</TableHead>
            <TableHead className="text-right">Prowizja</TableHead>
            <TableHead className="w-[180px]">Cel tygodniowy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const earned = row.commission_earned_gr ?? 0;
            const pct = Math.min(100, Math.round((earned / WEEKLY_TARGET_GR) * 100));
            return (
              <TableRow key={row.recipient_user_id ?? Math.random()}>
                <TableCell className="font-medium">
                  {row.full_name || row.email || row.recipient_user_id?.slice(0, 8) || '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.policies_count ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPLN(row.booked_premium_gr ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPLN(row.collected_premium_gr ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatPLN(earned)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress value={pct} className="h-2" />
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
