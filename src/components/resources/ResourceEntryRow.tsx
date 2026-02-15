import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { ConnectorBadge } from './ConnectorBadge';
import { AddConnectorDialog } from './AddConnectorDialog';
import { useDeleteResourceEntry } from '@/hooks/useResources';

const IMPORTANCE_LABELS: Record<string, string> = {
  low: 'Niska',
  medium: 'Średnia',
  high: 'Wysoka',
  critical: 'Krytyczna',
};

const IMPORTANCE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
};

interface ResourceEntryRowProps {
  entry: {
    id: string;
    title: string;
    person_name: string | null;
    person_position: string | null;
    notes: string | null;
    importance: string;
    connectors: any[];
  };
}

export function ResourceEntryRow({ entry }: ResourceEntryRowProps) {
  const del = useDeleteResourceEntry();

  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{entry.title}</span>
            <Badge variant={IMPORTANCE_VARIANT[entry.importance] || 'secondary'} className="text-[10px]">
              {IMPORTANCE_LABELS[entry.importance] || entry.importance}
            </Badge>
          </div>
          {(entry.person_name || entry.person_position) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {entry.person_name}{entry.person_position ? ` — ${entry.person_position}` : ''}
            </p>
          )}
          {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => del.mutate(entry.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {entry.connectors?.map((c: any) => <ConnectorBadge key={c.id} connector={c} />)}
        <AddConnectorDialog entryId={entry.id} />
      </div>
    </div>
  );
}
