import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMatches, useFindNewMatches, useUpdateMatchStatus, type EnrichedMatch } from '@/hooks/useMatches';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Handshake, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  X, 
  Sparkles, 
  User, 
  Building2,
  Filter,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function MatchCard({ match, onUpdateStatus }: { match: EnrichedMatch; onUpdateStatus: (status: 'accepted' | 'rejected' | 'pending') => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scorePercent = Math.round(match.similarityScore * 100);

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      match.status === 'accepted' && "border-green-500/50 bg-green-50/30 dark:bg-green-950/20",
      match.status === 'rejected' && "border-red-500/50 bg-red-50/30 dark:bg-red-950/20 opacity-75"
    )}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Need side */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                Potrzeba
              </Badge>
            </div>
            <h3 className="font-semibold text-lg">{match.needTitle}</h3>
            {match.needDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {match.needDescription}
              </p>
            )}
            <Link 
              to={`/contacts/${match.needContactId}`}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              {match.needContactName}
              {match.needContactCompany && (
                <>
                  <Building2 className="h-3.5 w-3.5 ml-1" />
                  {match.needContactCompany}
                </>
              )}
            </Link>
          </div>

          {/* Arrow / Match indicator */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-2 px-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-primary" />
              <Handshake className="h-6 w-6 text-primary" />
              <ArrowRight className="h-5 w-5 text-primary rotate-180" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{scorePercent}%</div>
              <Progress value={scorePercent} className="w-20 h-1.5" />
            </div>
          </div>

          {/* Mobile arrow */}
          <div className="flex lg:hidden items-center justify-center gap-4 py-2">
            <Handshake className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">{scorePercent}%</span>
            <Progress value={scorePercent} className="w-20 h-1.5" />
          </div>

          {/* Offer side */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                Oferta
              </Badge>
            </div>
            <h3 className="font-semibold text-lg">{match.offerTitle}</h3>
            {match.offerDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {match.offerDescription}
              </p>
            )}
            <Link 
              to={`/contacts/${match.offerContactId}`}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <User className="h-3.5 w-3.5" />
              {match.offerContactName}
              {match.offerContactCompany && (
                <>
                  <Building2 className="h-3.5 w-3.5 ml-1" />
                  {match.offerContactCompany}
                </>
              )}
            </Link>
          </div>
        </div>

        {/* AI Explanation */}
        {match.aiExplanation && (
          <div 
            className="mt-4 p-3 bg-primary/5 rounded-lg cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Wyjaśnienie AI
            </div>
            <p className={cn(
              "text-sm text-muted-foreground mt-1",
              !isExpanded && "line-clamp-2"
            )}>
              {match.aiExplanation}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Utworzono: {new Date(match.createdAt).toLocaleDateString('pl-PL')}
          </div>
          
          <div className="flex items-center gap-2">
            {match.status === 'pending' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus('rejected')}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Odrzuć
                </Button>
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus('accepted')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Akceptuj
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateStatus('pending')}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Przywróć
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchesLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-2 w-20" />
              </div>
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Matches() {
  const [activeTab, setActiveTab] = useState('pending');
  
  const { data: allMatches = [], isLoading: isLoadingAll } = useMatches({ limit: 100 });
  const findNewMatches = useFindNewMatches();
  const updateMatchStatus = useUpdateMatchStatus();

  // Filter matches by status
  const pendingMatches = allMatches.filter(m => m.status === 'pending');
  const acceptedMatches = allMatches.filter(m => m.status === 'accepted');
  const rejectedMatches = allMatches.filter(m => m.status === 'rejected');

  const handleUpdateStatus = (matchId: string, status: 'accepted' | 'rejected' | 'pending') => {
    updateMatchStatus.mutate({ id: matchId, status });
  };

  const renderMatchList = (matches: EnrichedMatch[]) => {
    if (matches.length === 0) {
      return (
        <EmptyState
          icon={Handshake}
          title="Brak dopasowań w tej kategorii"
          description="Kliknij 'Szukaj nowych dopasowań' aby znaleźć potencjalne połączenia"
        />
      );
    }

    return (
      <div className="space-y-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onUpdateStatus={(status) => handleUpdateStatus(match.id, status)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Handshake className="h-6 w-6" />
            Dopasowania
          </h1>
          <p className="text-muted-foreground">
            AI łączy potrzeby z ofertami w Twojej sieci kontaktów
          </p>
        </div>

        <Button
          onClick={() => findNewMatches.mutate({})}
          disabled={findNewMatches.isPending}
        >
          {findNewMatches.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Szukaj nowych dopasowań
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
              <Filter className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{pendingMatches.length}</div>
              <div className="text-sm text-muted-foreground">Oczekujące</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{acceptedMatches.length}</div>
              <div className="text-sm text-muted-foreground">Zaakceptowane</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{rejectedMatches.length}</div>
              <div className="text-sm text-muted-foreground">Odrzucone</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with matches */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Oczekujące
            {pendingMatches.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingMatches.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            Zaakceptowane
            {acceptedMatches.length > 0 && (
              <Badge variant="secondary" className="ml-1">{acceptedMatches.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Odrzucone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoadingAll ? <MatchesLoading /> : renderMatchList(pendingMatches)}
        </TabsContent>

        <TabsContent value="accepted" className="mt-4">
          {isLoadingAll ? <MatchesLoading /> : renderMatchList(acceptedMatches)}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {isLoadingAll ? <MatchesLoading /> : renderMatchList(rejectedMatches)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
