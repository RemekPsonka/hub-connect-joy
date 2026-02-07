import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Deal } from '@/hooks/useDeals';
import { cn } from '@/lib/utils';

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const navigate = useNavigate();

  const formattedValue = deal.value.toLocaleString('pl-PL', {
    style: 'currency',
    currency: deal.currency,
  });

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-medium text-sm line-clamp-2">{deal.title}</h4>
          <p className="text-lg font-semibold text-primary mt-1">{formattedValue}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {deal.contact ? (
            <>
              <User className="h-3 w-3" />
              <span className="truncate">{deal.contact.full_name}</span>
            </>
          ) : deal.company ? (
            <>
              <CompanyLogo companyName={deal.company.name} website={(deal.company as { website?: string | null }).website} size="sm" />
              <span className="truncate">{deal.company.name}</span>
            </>
          ) : null}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Prawdopodobieństwo</span>
            <span className="font-medium">{deal.probability}%</span>
          </div>
          <Progress 
            value={deal.probability} 
            className={cn(
              "h-1.5",
              deal.probability >= 70 && "[&>div]:bg-green-500",
              deal.probability >= 40 && deal.probability < 70 && "[&>div]:bg-yellow-500",
              deal.probability < 40 && "[&>div]:bg-red-500"
            )}
          />
        </div>

        {deal.expected_close_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(deal.expected_close_date), 'd MMM yyyy', { locale: pl })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
