import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useSuggestContacts,
  useAddSuggestedContact,
  useDismissSuggestion,
  useRegenerateEmbeddings,
} from '@/hooks/useSovraContactSuggestions';
import { cn } from '@/lib/utils';

interface SovraSuggestionsSectionProps {
  projectId: string;
}

export function SovraSuggestionsSection({ projectId }: SovraSuggestionsSectionProps) {
  const navigate = useNavigate();
  const { data: suggestions, isLoading, error } = useSuggestContacts(projectId);
  const addContact = useAddSuggestedContact();
  const { dismiss, filterSuggestions } = useDismissSuggestion();
  const regenerate = useRegenerateEmbeddings();

  const filtered = suggestions ? filterSuggestions(suggestions) : [];

  // Check if error is about missing embeddings
  const needsEmbeddings = error?.message?.includes('embedding') || 
    (suggestions?.length === 0 && !isLoading && !error);

  return (
    <div className="mt-6">
      {/* Divider */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">Sugestie Sovry</span>
        <Separator className="flex-1" />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error / needs embeddings */}
      {!isLoading && error && !needsEmbeddings && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-destructive">Nie udało się pobrać sugestii</p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* Needs embedding generation */}
      {!isLoading && needsEmbeddings && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sovra musi przygotować analizę</p>
              <p className="text-xs text-muted-foreground mt-1">
                Wygenerowanie profilu projektu zajmie chwilę. Po tym Sovra zasugeruje najlepszych kontaktów.
              </p>
              <Button
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => regenerate.mutate('projects')}
                disabled={regenerate.isPending}
              >
                {regenerate.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {regenerate.isPending ? 'Przygotowuję...' : 'Przygotuj analizę'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions list */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((suggestion) => {
            const initials = suggestion.full_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?';

            const similarityPct = Math.round(suggestion.similarity * 100);

            return (
              <div
                key={suggestion.contact_id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border transition-all',
                  'bg-gradient-to-r from-primary/5 to-transparent',
                  'border-primary/10 dark:border-primary/20',
                  'hover:shadow-sm'
                )}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/contacts/${suggestion.contact_id}`)}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
                  >
                    {suggestion.full_name}
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {suggestion.position && (
                      <span className="text-xs text-muted-foreground truncate">
                        {suggestion.position}
                      </span>
                    )}
                    {suggestion.position && suggestion.company && (
                      <span className="text-xs text-muted-foreground">·</span>
                    )}
                    {suggestion.company && (
                      <span className="text-xs text-muted-foreground truncate">
                        {suggestion.company}
                      </span>
                    )}
                  </div>

                  {/* AI reason */}
                  {suggestion.reason && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic leading-relaxed">
                      ✨ {suggestion.reason}
                    </p>
                  )}

                  {/* Similarity bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${similarityPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {similarityPct}% dopasowanie
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() =>
                      addContact.mutate({
                        projectId,
                        contactId: suggestion.contact_id,
                      })
                    }
                    disabled={addContact.isPending}
                  >
                    {addContact.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Dodaj
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => dismiss(suggestion.contact_id)}
                  >
                    <X className="h-3 w-3" />
                    Pomiń
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state — after loading, no error, no suggestions */}
      {!isLoading && !error && !needsEmbeddings && filtered.length === 0 && suggestions && suggestions.length > 0 && (
        <div className="text-center py-6">
          <Sparkles className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Wszystkie sugestie zostały przetworzone</p>
        </div>
      )}

      {!isLoading && !error && !needsEmbeddings && suggestions?.length === 0 && (
        <div className="text-center py-6">
          <Sparkles className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Sovra nie znalazła pasujących kontaktów</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Dodaj więcej kontaktów do CRM aby Sovra mogła lepiej dopasowywać
          </p>
        </div>
      )}
    </div>
  );
}
