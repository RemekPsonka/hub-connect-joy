import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  RefreshCw, Loader2, Search, Newspaper, Handshake, 
  Award, MessageSquare, Linkedin, TrendingUp, AlertTriangle,
  ExternalLink, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ExternalDataViewerProps {
  data: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ExternalDataViewer({ data, onRefresh, isRefreshing }: ExternalDataViewerProps) {
  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak danych z analizy zewnętrznej</p>
        {onRefresh && (
          <Button className="mt-4" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Uruchom analizę
          </Button>
        )}
      </div>
    );
  }

  const pressMentions = data.press_mentions || [];
  const contracts = data.public_contracts || [];
  const partnerships = data.partnerships || [];
  const awards = data.awards_certifications || [];
  const reviews = data.customer_reviews || [];
  const linkedinInsights = data.linkedin_insights;
  const marketPosition = data.market_position;
  const redFlags = data.red_flags || [];
  const citations = data.citations || data.sources || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Analiza zewnętrzna (Perplexity)</h3>
          <Badge variant="secondary">
            {citations.length} źródeł
          </Badge>
        </div>
        {onRefresh && (
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Red Flags - show first if any */}
      {redFlags.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Sygnały ostrzegawcze
            </h4>
            <ul className="space-y-1">
              {redFlags.map((flag: string, idx: number) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Market Position */}
      {marketPosition && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pozycja rynkowa
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {marketPosition.position && (
                <div>
                  <p className="text-muted-foreground">Pozycja</p>
                  <p className="font-medium">{marketPosition.position}</p>
                </div>
              )}
              {marketPosition.market_share && (
                <div>
                  <p className="text-muted-foreground">Udział w rynku</p>
                  <p className="font-medium">{marketPosition.market_share}</p>
                </div>
              )}
              {marketPosition.ranking && (
                <div>
                  <p className="text-muted-foreground">Ranking</p>
                  <p className="font-medium">{marketPosition.ranking}</p>
                </div>
              )}
            </div>
            {marketPosition.competitors?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground mb-1">Konkurenci:</p>
                <div className="flex flex-wrap gap-1">
                  {marketPosition.competitors.map((c: string, idx: number) => (
                    <Badge key={idx} variant="outline">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Press Mentions */}
      {pressMentions.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Wzmianki prasowe
              <Badge variant="outline">{pressMentions.length}</Badge>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pressMentions.map((mention: any, idx: number) => (
                <div key={idx} className="py-2 border-b last:border-0">
                  <p className="text-sm font-medium">{mention.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {mention.source && <span>{mention.source}</span>}
                    {mention.date && <span>• {mention.date}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Public Contracts */}
      {contracts.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Kontrakty publiczne
              <Badge variant="outline">{contracts.length}</Badge>
            </h4>
            <div className="space-y-2">
              {contracts.map((contract: any, idx: number) => (
                <div key={idx} className="py-2 border-b last:border-0">
                  <p className="text-sm">{contract.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {contract.client && <span>{contract.client}</span>}
                    {contract.value && <span>• {contract.value}</span>}
                    {contract.year && <span>• {contract.year}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partnerships */}
      {partnerships.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Partnerstwa
              <Badge variant="outline">{partnerships.length}</Badge>
            </h4>
            <div className="flex flex-wrap gap-2">
              {partnerships.map((p: any, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {typeof p === 'string' ? p : p.partner}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awards & Certifications */}
      {awards.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Nagrody i certyfikaty
              <Badge variant="outline">{awards.length}</Badge>
            </h4>
            <div className="flex flex-wrap gap-2">
              {awards.map((award: any, idx: number) => (
                <Badge key={idx} variant={award.type === 'award' ? 'default' : 'outline'}>
                  {typeof award === 'string' ? award : award.name}
                  {award.year && ` (${award.year})`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LinkedIn Insights */}
      {linkedinInsights && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {linkedinInsights.employees_count && (
                <div>
                  <p className="text-muted-foreground">Pracownicy</p>
                  <p className="font-medium">{linkedinInsights.employees_count}</p>
                </div>
              )}
              {linkedinInsights.growth && (
                <div>
                  <p className="text-muted-foreground">Wzrost</p>
                  <p className="font-medium">{linkedinInsights.growth}</p>
                </div>
              )}
              {linkedinInsights.activity_level && (
                <div>
                  <p className="text-muted-foreground">Aktywność</p>
                  <p className="font-medium">{linkedinInsights.activity_level}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Reviews */}
      {reviews.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Opinie klientów
              <Badge variant="outline">{reviews.length}</Badge>
            </h4>
            <div className="space-y-2">
              {reviews.slice(0, 3).map((review: any, idx: number) => (
                <div key={idx} className="py-2 border-b last:border-0">
                  <p className="text-sm italic">"{review.text}"</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {review.source && <span>{review.source}</span>}
                    {review.rating && <span>• {review.rating}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources/Citations */}
      {citations.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Źródła</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {citations.map((url: string, idx: number) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timestamp */}
      {data.analyzed_at && (
        <p className="text-xs text-muted-foreground">
          Analiza: {format(new Date(data.analyzed_at), 'd MMM yyyy, HH:mm', { locale: pl })}
        </p>
      )}
    </div>
  );
}
