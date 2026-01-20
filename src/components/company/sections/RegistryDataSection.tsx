import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SectionProps } from '../types';
import type { DataSources } from '../types';

interface RegistryDataSectionProps {
  data: any;
  dataSources?: DataSources;
}

export function RegistryDataSection({ data, dataSources }: RegistryDataSectionProps) {
  const sources = typeof data.sources === 'string'
    ? [data.sources]
    : data.sources || [];
  const analysisNotes = typeof data.analysis_notes === 'string'
    ? [data.analysis_notes]
    : data.analysis_notes || [];

  const hasRegistryData = data.nip || data.regon || data.krs;
  const hasAddress = data.address || data.city;
  
  // Check if data comes from KRS or CEIDG API (verified source)
  const isKrsVerified = dataSources?.krs_api?.verified === true || 
    (data.data_source === 'krs_api') ||
    (dataSources as any)?.registry_source === 'krs_api';
    
  const isCeidgVerified = dataSources?.ceidg_api?.verified === true ||
    (data.data_source === 'ceidg_api') ||
    (dataSources as any)?.registry_source === 'ceidg_api';
    
  const isVerified = isKrsVerified || isCeidgVerified;
  const verificationSource = isKrsVerified ? 'KRS' : (isCeidgVerified ? 'CEIDG' : null);

  if (!hasRegistryData && !hasAddress && sources.length === 0) return null;

  return (
    <SectionCard
      icon={<FileText className="h-4 w-4" />}
      title="Dane rejestrowe i źródła"
    >
      <div className="space-y-4">
        {/* Registry numbers with verification badges */}
        {hasRegistryData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.nip && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">NIP</p>
                  {isVerified && (
                    <Badge className={`text-[10px] flex items-center gap-0.5 ${isCeidgVerified ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {verificationSource}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-mono mt-0.5">{data.nip}</p>
              </div>
            )}
            {data.regon && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">REGON</p>
                  {isVerified && (
                    <Badge className={`text-[10px] flex items-center gap-0.5 ${isCeidgVerified ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {verificationSource}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-mono mt-0.5">{data.regon}</p>
              </div>
            )}
            {data.krs && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">KRS</p>
                  {isKrsVerified && (
                    <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      zweryfikowano
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-mono mt-0.5">{data.krs}</p>
              </div>
            )}
          </div>
        )}

        {/* Address */}
        {hasAddress && (
          <SectionBox title="Adres siedziby">
            <p className="text-sm">
              {[data.address, data.postal_code, data.city].filter(Boolean).join(', ')}
            </p>
          </SectionBox>
        )}

        {/* Data sources info */}
        {dataSources && (
          <SectionBox title="Źródła danych">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dataSources.perplexity && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Perplexity AI</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dataSources.perplexity.queries_executed || 
                     (dataSources.perplexity.topics?.length) || 
                     6} zapytań
                  </p>
                  {dataSources.perplexity.topics && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dataSources.perplexity.topics.slice(0, 3).map((topic, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{topic}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {dataSources.firecrawl && (
                <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Firecrawl</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dataSources.firecrawl.pages_scraped || 0} stron
                  </p>
                  {dataSources.firecrawl.total_words && (
                    <p className="text-xs text-muted-foreground">
                      {(dataSources.firecrawl.total_words / 1000).toFixed(1)}k słów
                    </p>
                  )}
                </div>
              )}
              {dataSources.lovable_ai && (
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-400">AI Model</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dataSources.lovable_ai.model || 'Gemini'}
                  </p>
                  {dataSources.lovable_ai.tokens_used && (
                    <p className="text-xs text-muted-foreground">
                      {dataSources.lovable_ai.tokens_used.toLocaleString()} tokenów
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionBox>
        )}

        {/* URL Sources */}
        {sources.length > 0 && (
          <SectionBox title="Źródła URL">
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sources.slice(0, 10).map((source, i) => (
                <a 
                  key={i}
                  href={source.startsWith('http') ? source : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline block truncate flex items-center gap-1"
                >
                  {source.startsWith('http') && <ExternalLink className="h-2.5 w-2.5 shrink-0" />}
                  {source}
                </a>
              ))}
              {sources.length > 10 && (
                <p className="text-xs text-muted-foreground">...i {sources.length - 10} więcej</p>
              )}
            </div>
          </SectionBox>
        )}

        {/* Analysis notes */}
        {analysisNotes.length > 0 && (
          <SectionBox title="Uwagi o danych" icon={<AlertCircle className="h-3 w-3" />}>
            <ul className="space-y-1">
              {analysisNotes.map((note, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span>•</span>
                  {note}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}

        {/* No registry data message */}
        {!hasRegistryData && !hasAddress && (
          <p className="text-sm text-muted-foreground italic">
            Brak danych rejestrowych w źródłach
          </p>
        )}
      </div>
    </SectionCard>
  );
}
