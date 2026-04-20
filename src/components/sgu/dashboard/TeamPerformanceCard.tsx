import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamPerformanceTable } from '@/components/sgu/TeamPerformanceTable';
import { useSGUTeamPerformance } from '@/hooks/useSGUTeamPerformance';

export function TeamPerformanceCard() {
  const { data, isLoading } = useSGUTeamPerformance(0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Wyniki zespołu (tydzień bieżący)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TeamPerformanceTable data={data ?? []} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
