import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useCompanyDataSources,
  type CompanyDataSourceType,
  type CompanyDataSource,
} from '@/hooks/useCompanyDataSources';

interface Props {
  companyId: string;
}

const SECTIONS: { key: CompanyDataSourceType; label: string }[] = [
  { key: 'external_api', label: 'Dane zewnętrzne (API)' },
  { key: 'source_data_api', label: 'KRS / CEIDG' },
  { key: 'www', label: 'Strona WWW' },
  { key: 'financial_3y', label: 'Dane finansowe (3 lata)' },
  { key: 'ai_analysis', label: 'Analiza AI' },
];

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('pl-PL');
  } catch {
    return value;
  }
}

function SourceCard({ label, source }: { label: string; source?: CompanyDataSource }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {source?.status && <Badge variant="secondary">{source.status}</Badge>}
          {source?.fetched_at && <span>{formatDate(source.fetched_at)}</span>}
        </div>
      </CardHeader>
      <CardContent>
        {source ? (
          <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(source.data, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">Brak danych</p>
        )}
      </CardContent>
    </Card>
  );
}

export function CompanyExternalDataTab({ companyId }: Props) {
  const { data, isLoading, error } = useCompanyDataSources(companyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Błąd ładowania danych: {(error as Error).message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map((s) => (
        <SourceCard key={s.key} label={s.label} source={data?.[s.key]} />
      ))}
    </div>
  );
}
