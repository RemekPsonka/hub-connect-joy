import { UserRound, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSGUAssigneeLoad } from '@/hooks/sgu-dashboard/useSGUAssigneeLoad';

export function AssigneeLoadCard() {
  const { data, isLoading } = useSGUAssigneeLoad();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Obłożenie per opiekun</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : (
          <>
            {data && data.unassigned > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-sm">
                  <UserX className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">Bez opiekuna</span>
                </div>
                <Badge variant="secondary">{data.unassigned}</Badge>
              </div>
            )}

            {(!data || data.assigned.length === 0) && data?.unassigned === 0 && (
              <p className="text-sm text-muted-foreground">Brak aktywnych firm w lejku.</p>
            )}

            <ul className="divide-y">
              {data?.assigned.map((row) => (
                <li
                  key={row.assignedTo ?? 'na'}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">
                      {row.fullName ?? row.email ?? 'Nieznany opiekun'}
                    </span>
                  </div>
                  <Badge variant="outline">{row.count}</Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}