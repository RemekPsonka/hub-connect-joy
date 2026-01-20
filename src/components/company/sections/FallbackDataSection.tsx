import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Globe, TrendingUp, MapPin, Briefcase, Newspaper, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FallbackDataSectionProps {
  perplexityRaw?: {
    profile?: string | null;
    financial?: string | null;
    locations?: string | null;
    projects?: string | null;
    news?: string | null;
  };
  citations?: string[];
  scrapedPages?: Array<{
    url: string;
    title?: string;
    category?: string;
    word_count?: number;
  }>;
}

export function FallbackDataSection({ perplexityRaw, citations, scrapedPages }: FallbackDataSectionProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    profile: true,
    financial: false,
    news: false
  });

  const hasAnyData = perplexityRaw && (
    perplexityRaw.profile || 
    perplexityRaw.financial || 
    perplexityRaw.locations || 
    perplexityRaw.projects || 
    perplexityRaw.news
  );

  if (!hasAnyData && (!citations || citations.length === 0)) {
    return null;
  }

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { key: 'profile', icon: Globe, label: 'Profil firmy', data: perplexityRaw?.profile },
    { key: 'financial', icon: TrendingUp, label: 'Dane finansowe', data: perplexityRaw?.financial },
    { key: 'locations', icon: MapPin, label: 'Lokalizacje', data: perplexityRaw?.locations },
    { key: 'projects', icon: Briefcase, label: 'Projekty referencyjne', data: perplexityRaw?.projects },
    { key: 'news', icon: Newspaper, label: 'Aktualności', data: perplexityRaw?.news },
  ].filter(s => s.data);

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Dane surowe z wyszukiwania
          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300 text-xs">
            Synteza AI nie powiodła się
          </Badge>
        </CardTitle>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          Poniżej surowe wyniki z Perplexity AI. Spróbuj ponownie wygenerować analizę, aby uzyskać pełny profil.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {sections.map(({ key, icon: Icon, label, data }) => (
          <Collapsible key={key} open={openSections[key]} onOpenChange={() => toggleSection(key)}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto bg-white dark:bg-background hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-amber-600" />
                  {label}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openSections[key] ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-white dark:bg-background rounded-lg border border-amber-200 dark:border-amber-800 prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{data || ''}</ReactMarkdown>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Citations */}
        {citations && citations.length > 0 && (
          <div className="pt-3 border-t border-amber-200 dark:border-amber-800">
            <h4 className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Źródła ({citations.length})
            </h4>
            <div className="flex flex-wrap gap-1">
              {citations.slice(0, 10).map((url, idx) => {
                const domain = url.replace(/https?:\/\//, '').split('/')[0];
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-white dark:bg-background border border-amber-200 dark:border-amber-700 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300 truncate max-w-[200px]"
                  >
                    {domain}
                  </a>
                );
              })}
              {citations.length > 10 && (
                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                  +{citations.length - 10} więcej
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Scraped pages info */}
        {scrapedPages && scrapedPages.length > 0 && (
          <div className="pt-3 border-t border-amber-200 dark:border-amber-800">
            <h4 className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
              Przeanalizowane strony ({scrapedPages.length})
            </h4>
            <div className="space-y-1">
              {scrapedPages.slice(0, 5).map((page, idx) => (
                <div key={idx} className="text-xs flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-white">
                    {page.category || 'page'}
                  </Badge>
                  <a 
                    href={page.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate max-w-[300px] hover:underline"
                  >
                    {page.title || page.url}
                  </a>
                  {page.word_count && (
                    <span className="text-amber-500">({page.word_count} słów)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
