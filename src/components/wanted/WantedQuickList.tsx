import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

const statusLabels: Record<string, string> = {
  active: 'Aktywne',
  in_progress: 'W trakcie',
  fulfilled: 'Znalezione',
  cancelled: 'Anulowane',
  expired: 'Wygasłe',
};

interface WantedQuickListProps {
  items: Array<{
    id: string;
    company_name: string | null;
    person_name: string | null;
    status: string;
  }>;
}

export function WantedQuickList({ items }: WantedQuickListProps) {
  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
          >
            <CompanyLogo companyName={item.company_name} size="sm" />
            <span className="font-medium text-sm truncate flex-1">
              {item.company_name || '—'}
            </span>
            <span className="text-sm text-muted-foreground truncate w-[180px] text-right">
              {item.person_name || '—'}
            </span>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {statusLabels[item.status] || item.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
