import { Globe, TrendingUp, MapPin, Briefcase, Newspaper, ExternalLink, ChevronDown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    profile: false,
    financial: false,
    news: false
  });
  const [showRawData, setShowRawData] = useState(false);

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
    <div className="space-y-3">
      {/* Subtle banner instead of large alert */}
      <Alert className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-800/30">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            Synteza AI niekompletna. Dostępne surowe dane z wyszukiwania.
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowRawData(!showRawData)}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100/50"
          >
            {showRawData ? 'Ukryj' : 'Pokaż'} dane
            <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showRawData ? 'rotate-180' : ''}`} />
          </Button>
        </AlertDescription>
      </Alert>

      {/* Collapsible raw data section */}
      {showRawData && (
        <div className="rounded-lg border border-amber-200/50 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-800/30 p-4 space-y-3">

          {sections.map(({ key, icon: Icon, label, data }) => (
            <Collapsible key={key} open={openSections[key]} onOpenChange={() => toggleSection(key)}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto bg-background hover:bg-muted/50 rounded-lg border"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                    <Badge variant="secondary" className="text-[10px]">AI</Badge>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections[key] ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-background rounded-lg border prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{data || ''}</ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Citations */}
          {citations && citations.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
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
                      className="inline-flex items-center px-2 py-0.5 text-xs bg-muted/50 border rounded hover:bg-muted text-muted-foreground truncate max-w-[200px]"
                    >
                      {domain}
                    </a>
                  );
                })}
                {citations.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{citations.length - 10} więcej
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Scraped pages info */}
          {scrapedPages && scrapedPages.length > 0 && (
            <div className="pt-3 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                Przeanalizowane strony ({scrapedPages.length})
              </h4>
              <div className="space-y-1">
                {scrapedPages.slice(0, 5).map((page, idx) => (
                  <div key={idx} className="text-xs flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
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
                      <span className="opacity-60">({page.word_count} słów)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
