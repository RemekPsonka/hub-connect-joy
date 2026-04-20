import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { SectionShell } from './SectionShell';

interface Props {
  companyId: string | null;
  enabled: boolean;
}

export function SectionCompany({ companyId, enabled }: Props) {
  const query = useQuery({
    queryKey: ['contact-v2-section', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, nip, industry, address, city, website')
        .eq('id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!companyId,
  });

  return (
    <SectionShell
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      refetch={query.refetch}
      isEmpty={!companyId || !query.data}
      emptyMessage="Kontakt nie jest powiązany z firmą"
    >
      {query.data && (
        <div className="space-y-2 text-sm">
          <Row label="Nazwa" value={query.data.name} />
          <Row label="NIP" value={query.data.nip} />
          <Row label="Branża" value={query.data.industry} />
          <Row label="Adres" value={[query.data.address, query.data.city].filter(Boolean).join(', ') || null} />
          <Row
            label="WWW"
            value={
              query.data.website ? (
                <a
                  href={query.data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {query.data.website}
                </a>
              ) : null
            }
          />
          <div className="pt-2">
            <Button asChild size="sm" variant="outline">
              <Link to={`/companies/${query.data.id}`}>
                Zobacz firmę <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-24 text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
