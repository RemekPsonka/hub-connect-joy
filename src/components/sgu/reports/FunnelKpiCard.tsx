import { Link } from 'react-router-dom';
import { ArrowRight, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFunnelMilestones } from '@/hooks/sgu-dashboard/useFunnelMilestones';

interface Tile {
  label: string;
  count: number;
}

export function FunnelKpiCard() {
  const { data, isLoading } = useFunnelMilestones();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Flag className="h-4 w-4" /> Lejek K1→K4 — kamienie milowe
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-24 w-full" />
        ) : data.k1 === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Za wcześnie — brak zakończonych spotkań (K1).
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sgu/sprzedaz">Zobacz pipeline</Link>
            </Button>
          </div>
        ) : (
          <FunnelRow
            tiles={[
              { label: 'K1 Spotkanie', count: data.k1 },
              { label: 'K2 Handshake', count: data.k2a },
              { label: 'K2+ Pełnomocnictwo', count: data.k2b },
              { label: 'K3 Audyt', count: data.k3 },
              { label: 'K4 Polisa', count: data.k4 },
            ]}
            conversions={[
              data.conversion.k1_to_k2a,
              data.conversion.k2a_to_k2b,
              data.conversion.k2b_to_k3,
              data.conversion.k3_to_k4,
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface FunnelRowProps {
  tiles: Tile[];
  conversions: number[];
}

function FunnelRow({ tiles, conversions }: FunnelRowProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-stretch gap-2">
      {tiles.map((tile, idx) => (
        <div key={tile.label} className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
          <div className="flex-1 rounded-md border bg-card p-3 text-center min-w-0">
            <div className="text-2xl font-bold tabular-nums">{tile.count}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate" title={tile.label}>
              {tile.label}
            </div>
          </div>
          {idx < tiles.length - 1 && (
            <div className="flex flex-row md:flex-col items-center justify-center text-muted-foreground shrink-0 gap-0.5 px-1">
              <ArrowRight className="h-3.5 w-3.5 md:rotate-0 rotate-90" />
              <span className="text-[10px] tabular-nums">{conversions[idx]}%</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}