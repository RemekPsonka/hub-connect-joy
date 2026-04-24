import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStalledContacts } from '@/hooks/sgu-dashboard/useStalledContacts';
import { OFFERING_STAGE_LABELS, OFFERING_STAGE_ORDER } from '@/types/dealTeam';

const TOP_LIMIT = 10;

export function StalledContactsCard() {
  const { data, isLoading } = useStalledContacts();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Zapomniani w lejku
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <Skeleton className="h-32 w-full" />
        ) : data.totalStalled === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-muted-foreground">
              🎉 Wszyscy klienci w lejku mają zaplanowane akcje.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{data.totalStalled}</span>
              <span className="text-sm text-muted-foreground">
                {data.totalStalled === 1
                  ? 'kontakt bez planowanej akcji'
                  : 'kontaktów bez planowanej akcji'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {OFFERING_STAGE_ORDER.filter((s) => (data.byStage[s] ?? 0) > 0).map((stage) => (
                <Badge key={stage} variant="secondary" className="text-xs">
                  {OFFERING_STAGE_LABELS[stage] ?? stage}: {data.byStage[stage]}
                </Badge>
              ))}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nazwa</TableHead>
                    <TableHead className="text-xs">Etap</TableHead>
                    <TableHead className="text-xs text-right">Dni bez akcji</TableHead>
                    <TableHead className="text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.contacts.slice(0, TOP_LIMIT).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.full_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.offering_stage_label}
                      </TableCell>
                      <TableCell className="text-sm text-right tabular-nums">
                        {c.days_since_update}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm" className="h-7">
                          <Link to="/sgu/sprzedaz">
                            Otwórz <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {data.contacts.length > TOP_LIMIT && (
              <p className="text-xs text-muted-foreground text-center">
                Pokazano top {TOP_LIMIT} z {data.contacts.length}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}