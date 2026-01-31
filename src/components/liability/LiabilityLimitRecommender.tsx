import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LiabilityRiskAlert } from './types';

interface LiabilityLimitRecommenderProps {
  suggestedLimit: number | null;
  reason: string | null;
  generatedAt: string | null;
  riskAlerts: LiabilityRiskAlert[];
  isGenerating: boolean;
  onGenerate: () => void;
  hasProfile: boolean;
}

function formatLimit(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} mld EUR`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(0)} mln EUR`;
  }
  return `${amount.toLocaleString('pl-PL')} EUR`;
}

export function LiabilityLimitRecommender({
  suggestedLimit,
  reason,
  generatedAt,
  riskAlerts,
  isGenerating,
  onGenerate,
  hasProfile,
}: LiabilityLimitRecommenderProps) {
  const criticalAlerts = riskAlerts.filter(a => a.type === 'critical');
  const warningAlerts = riskAlerts.filter(a => a.type === 'warning');
  const infoAlerts = riskAlerts.filter(a => a.type === 'info');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Rekomendacja limitu AI
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating || !hasProfile}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {suggestedLimit ? 'Aktualizuj' : 'Wygeneruj'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Alerts */}
        {riskAlerts.length > 0 && (
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{alert.message}</span>
              </div>
            ))}
            {warningAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              >
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-300">{alert.message}</span>
              </div>
            ))}
            {infoAlerts.map((alert) => (
              <div 
                key={alert.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
              >
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <span className="text-sm text-blue-700 dark:text-blue-300">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Recommendation */}
        {suggestedLimit ? (
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              SUGEROWANA SUMA GWARANCYJNA
            </div>
            <div className="text-4xl font-bold text-primary mb-4">
              💰 {formatLimit(suggestedLimit)}
            </div>
            
            {reason && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Uzasadnienie:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {reason.split('\n• ').map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span>•</span>
                      <span>{line.replace('• ', '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {generatedAt && (
              <div className="mt-4 text-xs text-muted-foreground">
                Wygenerowano: {new Date(generatedAt).toLocaleString('pl-PL')}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-lg border-2 border-dashed text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {hasProfile 
                ? 'Kliknij "Wygeneruj" aby otrzymać rekomendację limitu OC'
                : 'Wypełnij profil ekspozycji aby wygenerować rekomendację'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
