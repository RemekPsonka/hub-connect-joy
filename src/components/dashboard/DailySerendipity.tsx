import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lightbulb, 
  ChevronDown, 
  ThumbsUp, 
  ThumbsDown, 
  X, 
  Sparkles,
  Link2,
  Search,
  Eye,
  Phone,
  RefreshCw
} from 'lucide-react';
import { useDailySerendipity } from '@/hooks/useDailySerendipity';
import { cn } from '@/lib/utils';

export const DailySerendipity = () => {
  const navigate = useNavigate();
  const { 
    serendipity, 
    isLoading, 
    isGenerating,
    generateSerendipity, 
    markAsViewed, 
    markFeedback, 
    markActedOn 
  } = useDailySerendipity();

  // Mark as viewed when component mounts and serendipity exists
  useEffect(() => {
    if (serendipity && !serendipity.viewed_at) {
      markAsViewed(serendipity.id);
    }
  }, [serendipity?.id]);

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'connection':
        return 'Połącz osoby';
      case 'opportunity':
        return 'Zbadaj możliwość';
      case 'insight':
        return 'Zobacz więcej';
      case 'reminder':
        return 'Skontaktuj się';
      default:
        return 'Działaj';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'connection':
        return <Link2 className="h-4 w-4" />;
      case 'opportunity':
        return <Search className="h-4 w-4" />;
      case 'insight':
        return <Eye className="h-4 w-4" />;
      case 'reminder':
        return <Phone className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const handleAction = () => {
    if (!serendipity) return;
    
    markActedOn(serendipity.id);
    
    // Navigate based on type
    if (serendipity.contact_a_id) {
      navigate(`/contacts/${serendipity.contact_a_id}`);
    } else if (serendipity.need_id) {
      navigate(`/search?need=${serendipity.need_id}`);
    }
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('pl-PL', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!serendipity) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">Odkrycie Dnia</h3>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400">{formatDate()}</span>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Brak odkrycia na dziś. Wygeneruj nowe!
          </p>
          <Button 
            onClick={generateSerendipity} 
            disabled={isGenerating}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generuję...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generuj odkrycie
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Odkrycie Dnia</h3>
          </div>
          <span className="text-xs text-amber-600 dark:text-amber-400">{formatDate()}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main content */}
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-1">
            {serendipity.title}
          </h4>
          <p className="text-muted-foreground">
            {serendipity.description}
          </p>
        </div>

        {/* AI Reasoning - collapsible */}
        {serendipity.reasoning && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 transition-colors">
              <Sparkles className="h-3 w-3" />
              Dlaczego AI to sugeruje?
              <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <p className="text-sm text-muted-foreground bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-3">
                {serendipity.reasoning}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Related contacts cards */}
        {(serendipity.contact_a || serendipity.contact_b) && (
          <div className="flex gap-2 flex-wrap">
            {serendipity.contact_a && (
              <button
                onClick={() => navigate(`/contacts/${serendipity.contact_a_id}`)}
                className="flex-1 min-w-[140px] p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-amber-200 dark:border-amber-800 hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-left"
              >
                <p className="font-medium text-sm truncate">{serendipity.contact_a.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{serendipity.contact_a.company || 'Brak firmy'}</p>
              </button>
            )}
            
            {serendipity.contact_a && serendipity.contact_b && (
              <div className="flex items-center">
                <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            )}
            
            {serendipity.contact_b && (
              <button
                onClick={() => navigate(`/contacts/${serendipity.contact_b_id}`)}
                className="flex-1 min-w-[140px] p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-amber-200 dark:border-amber-800 hover:bg-white/80 dark:hover:bg-white/10 transition-colors text-left"
              >
                <p className="font-medium text-sm truncate">{serendipity.contact_b.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{serendipity.contact_b.company || 'Brak firmy'}</p>
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button 
            onClick={handleAction}
            className={cn(
              "bg-amber-600 hover:bg-amber-700",
              serendipity.acted_on && "bg-green-600 hover:bg-green-700"
            )}
            disabled={serendipity.acted_on}
          >
            {getActionIcon(serendipity.type)}
            <span className="ml-2">
              {serendipity.acted_on ? 'Wykonano ✓' : getActionLabel(serendipity.type)}
            </span>
          </Button>

          {/* Feedback buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => markFeedback(serendipity.id, 'helpful')}
              className={cn(
                "h-8 w-8",
                serendipity.feedback === 'helpful' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}
              disabled={!!serendipity.feedback}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => markFeedback(serendipity.id, 'not_helpful')}
              className={cn(
                "h-8 w-8",
                serendipity.feedback === 'not_helpful' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
              disabled={!!serendipity.feedback}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => markFeedback(serendipity.id, 'dismissed')}
              className={cn(
                "h-8 w-8",
                serendipity.feedback === 'dismissed' && "bg-muted text-muted-foreground"
              )}
              disabled={!!serendipity.feedback}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tip */}
        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
          💡 Odkrycie Dnia jest generowane każdego ranka i zawiera najbardziej nieoczywistą możliwość w Twojej sieci kontaktów.
        </p>
      </CardContent>
    </Card>
  );
};
