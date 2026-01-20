import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Download, 
  Copy, 
  Share2, 
  RefreshCw, 
  Loader2, 
  Calendar,
  Search,
  FileText,
  Database,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfidenceGauge } from './ConfidenceGauge';
import { CompletenessIndicator } from './CompletenessIndicator';
import type { CompanyAnalysis, DataSources } from './types';
import { exportCompanyAnalysisToPDF } from '@/utils/exportCompanyAnalysis';

interface AnalysisDashboardHeaderProps {
  analysis: CompanyAnalysis;
  confidenceScore: number;
  missingSections: string[];
  dataSources?: DataSources;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  fallbackUsed?: boolean;
}

export function AnalysisDashboardHeader({
  analysis,
  confidenceScore,
  missingSections,
  dataSources,
  onRegenerate,
  isRegenerating,
  fallbackUsed
}: AnalysisDashboardHeaderProps) {

  const handleExportPDF = () => {
    try {
      exportCompanyAnalysisToPDF(analysis);
      toast.success('PDF wygenerowany');
    } catch (error) {
      toast.error('Błąd podczas generowania PDF');
      console.error(error);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
      toast.success('Skopiowano do schowka');
    } catch {
      toast.error('Nie udało się skopiować');
    }
  };

  const handleShare = async () => {
    const companySlug = (analysis.name || 'company').toLowerCase().replace(/\s+/g, '-');
    const shareUrl = `${window.location.origin}/company/${companySlug}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link skopiowany');
    } catch {
      toast.error('Nie udało się skopiować');
    }
  };

  // Format analysis date
  const analysisDate = analysis.enrichment_metadata?.analyzed_at || analysis.analysis_metadata?.analyzed_at;
  const formattedDate = analysisDate
    ? new Date(analysisDate).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const perplexityQueries = dataSources?.perplexity?.queries_executed || 
    analysis.enrichment_metadata?.perplexity_queries || 0;
  const pagesScraped = dataSources?.firecrawl?.pages_scraped || 
    analysis.enrichment_metadata?.pages_scraped || 0;
  const totalSources = perplexityQueries + pagesScraped;

  return (
    <div className="space-y-4">
      {/* Top bar - date and actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {formattedDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
          )}
          {dataSources?.lovable_ai?.model && (
            <Badge variant="outline" className="text-xs font-normal">
              {dataSources.lovable_ai.model}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportPDF}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eksport PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kopiuj JSON</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Udostępnij</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="ml-2"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Regeneruj
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Confidence Card */}
        <Card className="bg-gradient-to-br from-background to-muted/30 border-muted/50">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <ConfidenceGauge score={confidenceScore} size="sm" />
            <span className="text-xs text-muted-foreground mt-1">Pewność danych</span>
          </CardContent>
        </Card>

        {/* Sources Card */}
        <Card className="bg-gradient-to-br from-background to-muted/30 border-muted/50">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            <div className="flex items-center gap-3 mb-2">
              {perplexityQueries > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Search className="h-4 w-4 text-primary" />
                        <span className="text-lg font-semibold">{perplexityQueries}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Zapytania Perplexity</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {pagesScraped > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-lg font-semibold">{pagesScraped}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Przeskanowane strony</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {totalSources > 0 ? `${totalSources} źródeł` : 'Brak danych'}
            </span>
          </CardContent>
        </Card>

        {/* Completeness Card */}
        <Card className="bg-gradient-to-br from-background to-muted/30 border-muted/50">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <CompletenessIndicator missingSections={missingSections} />
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="bg-gradient-to-br from-background to-muted/30 border-muted/50">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full">
            {fallbackUsed ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Dane zastępcze</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">
                  Synteza AI niekompletna
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Pełna analiza</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">
                  Wszystkie dane przetworzone
                </span>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
