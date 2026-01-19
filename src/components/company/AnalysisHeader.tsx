import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { 
  Download, 
  Copy, 
  Share2, 
  RefreshCw, 
  Loader2, 
  Building,
  Search,
  FileText,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { CompanyAnalysis, DataSources } from './types';
import { exportCompanyAnalysisToPDF } from '@/utils/exportCompanyAnalysis';

interface AnalysisHeaderProps {
  analysis: CompanyAnalysis;
  confidenceScore: number;
  dataSources?: DataSources;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function AnalysisHeader({
  analysis,
  confidenceScore,
  dataSources,
  onRegenerate,
  isRegenerating
}: AnalysisHeaderProps) {

  const handleExportPDF = () => {
    try {
      exportCompanyAnalysisToPDF(analysis);
    } catch (error) {
      toast.error('Błąd podczas generowania PDF');
      console.error(error);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(analysis, null, 2));
      toast.success('Skopiowano dane analizy do schowka');
    } catch (error) {
      toast.error('Nie udało się skopiować');
    }
  };

  const handleShare = async () => {
    const companySlug = (analysis.name || 'company').toLowerCase().replace(/\s+/g, '-');
    const shareUrl = `${window.location.origin}/company/${companySlug}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link skopiowany do schowka');
    } catch (error) {
      toast.error('Nie udało się skopiować linku');
    }
  };

  // Format analysis date
  const analysisDate = analysis.enrichment_metadata?.analyzed_at || analysis.analysis_metadata?.analyzed_at
    ? new Date(analysis.enrichment_metadata?.analyzed_at || analysis.analysis_metadata?.analyzed_at || '').toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const perplexityQueries = dataSources?.perplexity?.queries_executed || 
    analysis.enrichment_metadata?.perplexity_queries || 0;
  const pagesScraped = dataSources?.firecrawl?.pages_scraped || 
    analysis.enrichment_metadata?.pages_scraped || 0;

  return (
    <div className="space-y-3">
      {/* Main header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{analysis.name || 'Analiza firmy'}</h2>
          </div>
          {(analysis.industry || analysis.headquarters?.city) && (
            <p className="text-sm text-muted-foreground">
              {[analysis.industry, analysis.headquarters?.city || analysis.city].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceIndicator score={confidenceScore} size="md" showIcon />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
          >
            <Copy className="h-4 w-4 mr-1" />
            Kopiuj
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Udostępnij
          </Button>

          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regeneruj
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Data sources info */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {perplexityQueries > 0 && (
          <Badge variant="outline" className="text-xs">
            <Search className="h-3 w-3 mr-1" />
            Perplexity ({perplexityQueries} zapytań)
          </Badge>
        )}
        {pagesScraped > 0 && (
          <Badge variant="outline" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Firecrawl ({pagesScraped} stron)
          </Badge>
        )}
        {dataSources?.lovable_ai?.model && (
          <Badge variant="outline" className="text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            {dataSources.lovable_ai.model}
          </Badge>
        )}
        {analysisDate && (
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {analysisDate}
          </span>
        )}
      </div>
    </div>
  );
}
