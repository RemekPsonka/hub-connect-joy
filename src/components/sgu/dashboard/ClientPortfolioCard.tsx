import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSGUClientCount } from '@/hooks/sgu-dashboard/useSGUClientCount';

export function ClientPortfolioCard() {
  const { data, isLoading } = useSGUClientCount();

  return (
    <Link
      to="/sgu/klienci"
      className="block transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring rounded-lg"
    >
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="rounded-md bg-emerald-50 text-emerald-700 p-3 dark:bg-emerald-950/40">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Portfel klientów</div>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <div className="text-2xl font-semibold leading-tight">{data ?? 0}</div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5">
              Łącznie klientów w SGU
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}