import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Users, MessageSquare, Target, RefreshCw, ChevronRight } from 'lucide-react';
import { useAIRecommendations, AIRecommendation } from '@/hooks/useAIRecommendations';
import { RecommendationDetailModal } from './RecommendationDetailModal';
import { cn } from '@/lib/utils';

const typeConfig = {
  connection: {
    icon: Users,
    label: 'Połączenie',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  followup: {
    icon: MessageSquare,
    label: 'Follow-up',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  opportunity: {
    icon: Target,
    label: 'Możliwość',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
};

const priorityColors = {
  high: 'border-l-destructive',
  medium: 'border-l-warning',
  low: 'border-l-muted-foreground',
};

interface RecommendationItemProps {
  recommendation: AIRecommendation;
  onClick: () => void;
}

function RecommendationItem({ recommendation, onClick }: RecommendationItemProps) {
  const config = typeConfig[recommendation.type];
  const Icon = config.icon;
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border border-l-4 bg-card hover:bg-accent/50 transition-colors cursor-pointer group",
        priorityColors[recommendation.priority]
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", config.bg, config.color)}>
              {config.label}
            </span>
            {recommendation.priority === 'high' && (
              <span className="text-xs text-destructive font-medium">Pilne</span>
            )}
          </div>
          <p className="font-medium text-sm">{recommendation.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {recommendation.description}
          </p>
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" />
      </div>
    </div>
  );
}

export function AIRecommendations() {
  const { recommendations, isLoading, error, fetchRecommendations } = useAIRecommendations();
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRecommendationClick = (rec: AIRecommendation) => {
    setSelectedRecommendation(rec);
    setModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Refresh recommendations after closing modal (in case action was taken)
      fetchRecommendations();
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Rekomendacje AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Rekomendacje AI
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={fetchRecommendations}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {error ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRecommendations}>
                Spróbuj ponownie
              </Button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Brak rekomendacji</p>
              <p className="text-xs text-muted-foreground">
                Dodaj więcej kontaktów, aby otrzymać sugestie
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.slice(0, 5).map((rec) => (
                <RecommendationItem 
                  key={rec.id} 
                  recommendation={rec} 
                  onClick={() => handleRecommendationClick(rec)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecommendationDetailModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        recommendation={selectedRecommendation}
      />
    </>
  );
}
