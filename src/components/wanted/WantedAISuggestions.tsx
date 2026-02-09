import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWantedAISuggestions } from '@/hooks/useWantedContacts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { MatchWantedDialog } from './MatchWantedDialog';

export function WantedAISuggestions({ industry, wantedId }: { industry: string | null; wantedId: string }) {
  const { data: suggestions } = useWantedAISuggestions(industry);
  const [expanded, setExpanded] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="bg-primary/5 rounded-md p-2.5 space-y-1.5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-primary w-full">
        <Sparkles className="h-3 w-3" />
        <span className="font-medium">AI: {suggestions.length} kontakt(ów) z podobnej branży</span>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {expanded && (
        <div className="space-y-1 pl-4">
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-xs">
              <span>
                <Link to={`/contacts/${s.id}`} className="text-primary hover:underline">{s.full_name}</Link>
                {s.company && <span className="text-muted-foreground ml-1">({s.company})</span>}
              </span>
              <Badge variant="outline" className="text-[10px]">{s.position || 'b/d'}</Badge>
            </div>
          ))}
        </div>
      )}
      <MatchWantedDialog open={matchOpen} onOpenChange={setMatchOpen} wantedId={wantedId} />
    </div>
  );
}
