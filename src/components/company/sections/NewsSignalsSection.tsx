import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Newspaper, TrendingUp, ExternalLink } from 'lucide-react';
import type { SectionProps, NewsItem, MarketSignal } from '../types';

export function NewsSignalsSection({ data }: SectionProps) {
  const recentNews = data.recent_news || [];
  const marketSignals = data.market_signals || [];

  // Parse news from various formats
  const newsList: NewsItem[] = typeof recentNews === 'string'
    ? [{ title: recentNews, summary: '' }]
    : recentNews as NewsItem[];

  // Parse market signals
  const signalsList: Array<MarketSignal | string> = typeof marketSignals === 'string'
    ? [marketSignals]
    : marketSignals;

  const hasData = newsList.length > 0 || signalsList.length > 0 || data.sentiment;

  if (!hasData) return null;

  const sentimentBadge = () => {
    switch (data.sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-700 border-green-200">😊 Pozytywny</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-700 border-red-200">😟 Negatywny</Badge>;
      default:
        return <Badge variant="outline">😐 Neutralny</Badge>;
    }
  };

  return (
    <SectionCard
      icon={<Newspaper className="h-4 w-4" />}
      title="Aktualności i sygnały rynkowe"
    >
      <div className="space-y-4">
        {/* Sentiment */}
        {data.sentiment && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ogólny sentyment:</span>
            {sentimentBadge()}
          </div>
        )}

        {/* Recent news */}
        {newsList.length > 0 && typeof newsList[0] === 'object' && (
          <SectionBox title={`Ostatnie wiadomości (${newsList.length})`}>
            <div className="space-y-2">
              {newsList.slice(0, 6).map((news, i) => (
                <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{news.title}</p>
                      {news.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5">{news.summary}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {news.date && (
                        <Badge variant="outline" className="text-[10px]">{news.date}</Badge>
                      )}
                      {news.sentiment && (
                        <span className="text-xs">
                          {news.sentiment === 'positive' ? '👍' : news.sentiment === 'negative' ? '👎' : '➡️'}
                        </span>
                      )}
                    </div>
                  </div>
                  {news.source && (
                    <a 
                      href={news.url || (news.source.startsWith('http') ? news.source : undefined)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
                    >
                      {news.source.startsWith('http') ? (
                        <>Źródło <ExternalLink className="h-2.5 w-2.5" /></>
                      ) : news.source}
                    </a>
                  )}
                </div>
              ))}
              {newsList.length > 6 && (
                <p className="text-xs text-muted-foreground">
                  ...i {newsList.length - 6} więcej wiadomości
                </p>
              )}
            </div>
          </SectionBox>
        )}

        {/* Market signals */}
        {signalsList.length > 0 && (
          <SectionBox title="Sygnały rynkowe" icon={<TrendingUp className="h-3 w-3" />}>
            <ul className="space-y-1.5">
              {signalsList.map((signal, i) => {
                if (typeof signal === 'string') {
                  return (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      {signal}
                    </li>
                  );
                }
                return (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <span>{signal.description}</span>
                      {signal.type && (
                        <Badge variant="outline" className="text-[10px] ml-2">{signal.type}</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
