import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { SovraSession } from '@/hooks/useSovraSessions';

interface SovraSidebarProps {
  sessions: SovraSession[];
  isLoading: boolean;
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  morning: { label: 'Brief', emoji: '☀️' },
  chat: { label: 'Chat', emoji: '💬' },
  debrief: { label: 'Debrief', emoji: '📝' },
  evening: { label: 'Wieczorny', emoji: '🌙' },
};

export function SovraSidebar({
  sessions,
  isLoading,
  activeSessionId,
  onNewSession,
  onSelectSession,
}: SovraSidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">Sovra</span>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onNewSession}>
          <Plus className="h-3.5 w-3.5" />
          Nowa
        </Button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-2">
            Brak historii rozmów
          </p>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const typeInfo = TYPE_LABELS[session.type] || TYPE_LABELS.chat;
            const timeAgo = session.started_at
              ? formatDistanceToNow(new Date(session.started_at), { addSuffix: true, locale: pl })
              : '';

            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-card border border-border shadow-sm'
                    : 'hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs">{typeInfo.emoji}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                    {typeInfo.label}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate text-foreground">
                  {session.title || 'Rozmowa'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
