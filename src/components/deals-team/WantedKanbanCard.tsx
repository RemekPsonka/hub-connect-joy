import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WantedItem {
  id: string;
  person_name: string | null;
  company_name: string | null;
  person_position: string | null;
  status: string;
  urgency: string;
  requested_by?: { id: string; full_name: string; company: string | null } | null;
  matched_director?: { id: string; full_name: string } | null;
}

interface WantedKanbanCardProps {
  item: WantedItem;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  fulfilled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const statusLabels: Record<string, string> = {
  active: 'Aktywny',
  in_progress: 'W trakcie',
  fulfilled: 'Znaleziony',
};

export function WantedKanbanCard({ item }: WantedKanbanCardProps) {
  const displayName = item.person_name || item.company_name || 'Nieznany';

  return (
    <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{displayName}</p>
            {item.person_name && item.company_name && (
              <p className="text-xs text-muted-foreground truncate">{item.company_name}</p>
            )}
            {item.person_position && (
              <p className="text-xs text-muted-foreground truncate">{item.person_position}</p>
            )}
          </div>
          <Badge className={`text-xs shrink-0 ${statusColors[item.status] || ''}`}>
            {statusLabels[item.status] || item.status}
          </Badge>
        </div>

        {item.requested_by && (
          <p className="text-xs text-muted-foreground truncate">
            Szuka: {item.requested_by.full_name}
          </p>
        )}

        {item.matched_director && (
          <p className="text-xs text-emerald-600 truncate">
            Zna: {item.matched_director.full_name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
