import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { BookOpen, Calendar, MessageSquare, BarChart3, FolderOpen, Users, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContactKnowledge, type KnowledgeEntry } from '@/hooks/useContactKnowledge';

interface ContactKnowledgeTimelineProps {
  contactId: string;
}

const sourceConfig: Record<KnowledgeEntry['source'], { icon: typeof Calendar; color: string; bg: string }> = {
  consultation: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  task_comment: { icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
  weekly_status: { icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
  project_note: { icon: FolderOpen, color: 'text-green-600', bg: 'bg-green-50' },
  one_on_one: { icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
  deal_note: { icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
};

export function ContactKnowledgeTimeline({ contactId }: ContactKnowledgeTimelineProps) {
  const { data: entries = [], isLoading } = useContactKnowledge(contactId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) return null;

  const visibleEntries = expanded ? entries : entries.slice(0, 5);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Zebrana wiedza
          <Badge variant="secondary" className="text-xs ml-auto">
            {entries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2">
        {visibleEntries.map((entry) => {
          const config = sourceConfig[entry.source];
          const Icon = config.icon;
          return (
            <div key={entry.id} className="flex gap-2 text-xs">
              <div className={`shrink-0 mt-0.5 p-1 rounded ${config.bg}`}>
                <Icon className={`h-3 w-3 ${config.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`font-medium ${config.color}`}>{entry.sourceLabel}</span>
                  <span className="text-muted-foreground">
                    {(() => {
                      try {
                        return format(new Date(entry.date), 'd MMM yyyy', { locale: pl });
                      } catch {
                        return '';
                      }
                    })()}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{entry.content}</p>
              </div>
            </div>
          );
        })}
        {entries.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Zwiń' : `Pokaż wszystkie (${entries.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
