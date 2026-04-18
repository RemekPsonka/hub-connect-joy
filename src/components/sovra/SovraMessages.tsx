import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckSquare, FileText, ArrowRight, FolderOpen, AlertCircle, Search, Wrench, Check, X, Clock } from 'lucide-react';
import { SovraAvatar } from './SovraAvatar';
import { SovraConfirmModal } from './SovraConfirmModal';
import { Button } from '@/components/ui/button';
import type { SovraMessage, ToolAction, ToolResultEvent, PendingActionInfo } from '@/hooks/useSovraChat';
import { cn } from '@/lib/utils';

interface SovraMessagesProps {
  messages: SovraMessage[];
  isStreaming: boolean;
  onConfirm?: (pendingActionId: string, decision: 'confirm' | 'cancel') => Promise<boolean>;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Do zrobienia',
  in_progress: 'W toku',
  done: 'Ukończone',
  cancelled: 'Anulowane',
  new: 'Nowy',
  analysis: 'Analiza',
  waiting: 'Oczekiwanie',
};

const TOOL_LABELS: Record<string, string> = {
  search_contacts: 'Wyszukiwanie kontaktów',
  search_companies: 'Wyszukiwanie firm',
  search_deals: 'Wyszukiwanie szans sprzedaży',
  get_contact_details: 'Szczegóły kontaktu',
  analyze_pipeline: 'Analiza lejka',
};

function ToolActionBubble({ action }: { action: ToolAction }) {
  if (!action.success) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Nie udało się: {String(action.result?.error || action.tool)}</span>
      </div>
    );
  }

  switch (action.tool) {
    case 'create_task':
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs">
          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
          <span>Utworzono zadanie: <strong>{action.result.title as string}</strong></span>
        </div>
      );
    case 'add_project_note':
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>Zapisano notatkę w projekcie{action.result.project_name ? `: ${action.result.project_name}` : ''}</span>
        </div>
      );
    case 'update_task_status': {
      const statusLabel = STATUS_LABELS[String(action.result.new_status)] || String(action.result.new_status);
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span>Zmieniono status zadania{action.result.title ? ` "${String(action.result.title)}"` : ''} na: <strong>{statusLabel}</strong></span>
        </div>
      );
    }
    case 'update_project_status': {
      const statusLabel = STATUS_LABELS[String(action.result.new_status)] || String(action.result.new_status);
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-xs">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          <span>Zmieniono status projektu{action.result.project_name ? ` "${String(action.result.project_name)}"` : ''} na: <strong>{statusLabel}</strong></span>
        </div>
      );
    }
    default:
      return null;
  }
}

function ToolResultBubble({ ev }: { ev: ToolResultEvent }) {
  const label = TOOL_LABELS[ev.tool] || ev.tool;
  const result = ev.result as Record<string, unknown> | null | undefined;
  const count = Array.isArray(result?.results) ? result!.results.length : null;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 border border-border text-muted-foreground text-xs">
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span>{label}{count !== null ? ` — ${count} wyników` : ''}</span>
    </div>
  );
}

function PendingActionBubble({
  pending,
  onConfirm,
}: {
  pending: PendingActionInfo;
  onConfirm?: (id: string, decision: 'confirm' | 'cancel') => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);

  if (pending.status === 'confirmed') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs">
        <Check className="h-3.5 w-3.5 shrink-0" />
        <span>{pending.human_summary}</span>
      </div>
    );
  }
  if (pending.status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs">
        <X className="h-3.5 w-3.5 shrink-0" />
        <span className="line-through">{pending.human_summary}</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <Wrench className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">Sovra proponuje akcję</div>
            <div className="text-muted-foreground text-xs mt-0.5">{pending.human_summary}</div>
            {!pending.integration_ready && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1">
                <Clock className="h-3 w-3" />
                <span>Integracja jeszcze nieaktywna</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => setOpen(true)}>Potwierdź</Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onConfirm?.(pending.pending_action_id, 'cancel')}
          >
            Anuluj
          </Button>
        </div>
      </div>
      <SovraConfirmModal
        open={open}
        summary={pending.human_summary}
        integrationReady={pending.integration_ready}
        onClose={() => setOpen(false)}
        onDecision={(d) => (onConfirm ? onConfirm(pending.pending_action_id, d) : Promise.resolve(false))}
      />
    </>
  );
}

export function SovraMessages({ messages, isStreaming, onConfirm }: SovraMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const showCursor = isStreaming && isLast && msg.role === 'assistant' && !msg.pending_action;

        if (msg.role === 'tool_results' && msg.actions) {
          return (
            <div key={i} className="flex justify-start gap-3">
              <div className="w-8" />
              <div className="space-y-1.5 max-w-[70%]">
                {msg.actions.map((action, ai) => (
                  <ToolActionBubble key={ai} action={action} />
                ))}
              </div>
            </div>
          );
        }

        if (msg.role === 'user') {
          return (
            <div key={i} className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[70%] text-sm">
                {msg.content}
              </div>
            </div>
          );
        }

        const hasOnlyExtras = !msg.content && (msg.tool_results?.length || msg.pending_action);

        return (
          <div key={i} className="flex justify-start gap-3">
            <SovraAvatar size="sm" className="mt-1" />
            <div className="space-y-2 max-w-[70%]">
              {(msg.content || !hasOnlyExtras) && (
                <div className={cn(
                  'bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm shadow-sm',
                  !msg.content && !showCursor && 'hidden'
                )}>
                  {msg.content ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : null}
                  {showCursor && (
                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                  )}
                </div>
              )}
              {msg.tool_results?.map((ev, ti) => <ToolResultBubble key={ti} ev={ev} />)}
              {msg.pending_action && (
                <PendingActionBubble pending={msg.pending_action} onConfirm={onConfirm} />
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
