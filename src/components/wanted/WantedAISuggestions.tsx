import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useWantedAISuggestions, useMatchWantedContact } from '@/hooks/useWantedContacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Check, X, Loader2 } from 'lucide-react';

export function WantedAISuggestions({ industry, wantedId }: { industry: string | null; wantedId: string }) {
  const { data: suggestions } = useWantedAISuggestions(industry);
  const [expanded, setExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const matchMutation = useMatchWantedContact();

  const visibleSuggestions = (suggestions || []).filter(s => !dismissedIds.has(s.id));

  if (visibleSuggestions.length === 0) return null;

  const handleQuickMatch = (contactId: string) => {
    setMatchingId(contactId);
    matchMutation.mutate(
      { wantedId, contactId },
      { onSettled: () => setMatchingId(null) }
    );
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  return (
    <div className="bg-primary/5 rounded-md p-2.5 space-y-1.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-primary w-full">
        <Sparkles className="h-3 w-3" />
        <span className="font-medium">AI: {visibleSuggestions.length} kontakt(ów) z podobnej branży</span>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {expanded && (
        <div className="space-y-1 pl-4">
          {visibleSuggestions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">
                <Link to={`/contacts/${s.id}`} className="text-primary hover:underline">{s.full_name}</Link>
                {s.company && <span className="text-muted-foreground ml-1">({s.company})</span>}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost"
                  className="h-6 px-1.5 text-[10px] text-green-600 hover:bg-green-50"
                  onClick={() => handleQuickMatch(s.id)}
                  disabled={matchingId === s.id}>
                  {matchingId === s.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <><Check className="h-3 w-3" /> To ta!</>}
                </Button>
                <Button size="sm" variant="ghost"
                  className="h-6 px-1.5 text-[10px] text-muted-foreground"
                  onClick={() => handleDismiss(s.id)}>
                  <X className="h-3 w-3" />
                </Button>
                <Badge variant="outline" className="text-[10px]">{s.position || 'b/d'}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
