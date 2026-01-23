import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { useMatches, useFindNewMatches, useUpdateMatchStatus } from '@/hooks/useMatches';

export function PendingMatches() {
  const navigate = useNavigate();
  const { data: matches, isLoading } = useMatches({ status: 'pending', limit: 4 });
  const findNewMatches = useFindNewMatches();
  const updateStatus = useUpdateMatchStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Dopasowania AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const handleAccept = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate({ id, status: 'accepted' });
  };

  const handleReject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate({ id, status: 'rejected' });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Dopasowania AI
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => findNewMatches.mutate({})}
            disabled={findNewMatches.isPending}
            className="h-8 gap-1"
          >
            {findNewMatches.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Szukaj
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!matches || matches.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Brak oczekujących dopasowań</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => findNewMatches.mutate({})}
              disabled={findNewMatches.isPending}
              className="mt-2"
            >
              {findNewMatches.isPending ? 'Szukam...' : 'Znajdź dopasowania'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => (
              <div
                key={match.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {match.needTitle || match.needDescription || 'Potrzeba'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      ↔ {match.offerTitle || match.offerDescription || 'Oferta'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleReject(match.id, e)}
                      disabled={updateStatus.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                      onClick={(e) => handleAccept(match.id, e)}
                      disabled={updateStatus.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={match.similarityScore * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {Math.round(match.similarityScore * 100)}%
                  </span>
                </div>
              </div>
            ))}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/matches')}
              className="w-full mt-2 text-muted-foreground hover:text-foreground"
            >
              Zobacz wszystkie
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
