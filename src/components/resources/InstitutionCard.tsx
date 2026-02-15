import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { ResourceEntryRow } from './ResourceEntryRow';
import { AddResourceEntryDialog } from './AddResourceEntryDialog';
import { useDeleteInstitution } from '@/hooks/useResources';

const CATEGORY_LABELS: Record<string, string> = {
  bank: 'Bank',
  ubezpieczyciel: 'Ubezpieczyciel',
  leasing: 'Leasing',
  kancelaria: 'Kancelaria',
  fundusz: 'Fundusz',
  inne: 'Inne',
};

interface InstitutionCardProps {
  institution: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    entries: any[];
  };
}

export function InstitutionCard({ institution }: InstitutionCardProps) {
  const del = useDeleteInstitution();
  const connectorCount = institution.entries?.reduce((sum: number, e: any) => sum + (e.connectors?.length || 0), 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{institution.name}</CardTitle>
              <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[institution.category] || institution.category}</Badge>
            </div>
            {institution.description && <p className="text-sm text-muted-foreground mt-1">{institution.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {institution.entries?.length || 0} zasobów · {connectorCount} połączeń
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => del.mutate(institution.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {institution.entries?.map((entry: any) => <ResourceEntryRow key={entry.id} entry={entry} />)}
        <AddResourceEntryDialog institutionId={institution.id} />
      </CardContent>
    </Card>
  );
}
