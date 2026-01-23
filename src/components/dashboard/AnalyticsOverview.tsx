import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  Target,
  CalendarCheck,
  Handshake,
  BarChart3,
  Brain,
  Lightbulb,
  Loader2
} from 'lucide-react';
import { useAnalytics, AIInsight } from '@/hooks/useAnalytics';
import { useEffect } from 'react';

export function AnalyticsOverview() {
  const { data, aiInsights, isLoading, isLoadingInsights, generateAIInsights } = useAnalytics('30d');

  // Auto-generate insights when data loads
  useEffect(() => {
    if (data && aiInsights.length === 0 && !isLoadingInsights) {
      generateAIInsights();
    }
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Analityka sieci
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Analityka sieci
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Brak danych do analizy</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { metrics, networkHealth } = data;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Analityka sieci
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Ostatnie 30 dni
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Kontakty</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{metrics.totalContacts}</span>
              {metrics.contactsGrowth !== 0 && (
                <span className={`text-xs flex items-center gap-0.5 ${metrics.contactsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.contactsGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {metrics.contactsGrowth >= 0 ? '+' : ''}{metrics.contactsGrowth}%
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Potrzeby</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{metrics.activeNeeds}</span>
              <span className="text-xs text-muted-foreground">
                {metrics.needsFulfillmentRate}% realizacji
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Spotkania</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{metrics.totalMeetings}</span>
              <span className="text-xs text-muted-foreground">
                ~{metrics.avgMeetingsPerWeek}/tyg
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Połączenia</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{metrics.successfulMatches}</span>
              <span className="text-xs text-muted-foreground">
                {metrics.matchSuccessRate}% sukcesu
              </span>
            </div>
          </div>
        </div>

        {/* Network Health - Compact */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Zdrowie sieci</p>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
            {networkHealth.healthyPercent > 0 && (
              <div 
                className="bg-green-500 transition-all duration-500" 
                style={{ width: `${networkHealth.healthyPercent}%` }} 
              />
            )}
            {networkHealth.warningPercent > 0 && (
              <div 
                className="bg-yellow-500 transition-all duration-500" 
                style={{ width: `${networkHealth.warningPercent}%` }} 
              />
            )}
            {networkHealth.criticalPercent > 0 && (
              <div 
                className="bg-red-500 transition-all duration-500" 
                style={{ width: `${networkHealth.criticalPercent}%` }} 
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Zdrowe ({networkHealth.healthy})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Ostrzeżenie ({networkHealth.warning})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Krytyczne ({networkHealth.critical})
            </span>
          </div>
        </div>

        {/* AI Insights - Top 2 only */}
        {(aiInsights.length > 0 || isLoadingInsights) && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Brain className="h-3 w-3" />
              Insights AI
            </p>
            {isLoadingInsights ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {aiInsights.slice(0, 2).map((insight: AIInsight, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                    <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${
                      insight.type === 'positive' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{insight.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
