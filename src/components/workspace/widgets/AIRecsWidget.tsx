import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Pin, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAIRecommendations, type AIRecommendation } from '@/hooks/useAIRecommendations';
import { useCreateNote } from '@/hooks/useWorkspaceNotes';

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-muted text-muted-foreground',
};

export function AIRecsWidget() {
  const { recommendations, isLoading, error, fetchRecommendations, removeRecommendation } =
    useAIRecommendations();
  const createNote = useCreateNote();

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handlePin = async (rec: AIRecommendation) => {
    try {
      await createNote.mutateAsync({
        title: rec.title,
        blocks: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: rec.title }] },
            { type: 'paragraph', content: [{ type: 'text', text: rec.description }] },
            ...(rec.reasoning
              ? [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: `Uzasadnienie: ${rec.reasoning}` }],
                  },
                ]
              : []),
          ],
        },
      });
      toast.success('Dopięto do notatki');
      removeRecommendation(rec.id);
    } catch (e) {
      // toast handled in hook
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Rekomendacje AI</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => fetchRecommendations()}
          disabled={isLoading}
          aria-label="Odśwież"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {isLoading && recommendations.length === 0 && (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        )}

        {!isLoading && error && (
          <div className="text-xs text-destructive p-3 text-center">{error}</div>
        )}

        {!isLoading && !error && recommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Sparkles className="h-6 w-6 text-muted-foreground mb-2" />
            <div className="text-sm text-muted-foreground mb-3">
              Sovra nie ma dziś rekomendacji
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchRecommendations()}>
              Wygeneruj teraz
            </Button>
          </div>
        )}

        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="border rounded-md p-2.5 space-y-2 bg-card hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium leading-tight flex-1">{rec.title}</div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded uppercase shrink-0 ${
                  PRIORITY_BADGE[rec.priority] ?? PRIORITY_BADGE.low
                }`}
              >
                {rec.priority}
              </span>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-3">{rec.description}</div>
            {rec.contactNames && rec.contactNames.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                👤 {rec.contactNames.join(', ')}
              </div>
            )}
            <div className="flex items-center gap-1 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => handlePin(rec)}
                disabled={createNote.isPending}
              >
                <Pin className="h-3 w-3" /> Dopnij do notatki
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => removeRecommendation(rec.id)}
              >
                <X className="h-3 w-3" /> Odrzuć
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
