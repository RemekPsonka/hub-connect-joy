import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckSquare, FileText, ArrowRight, FolderOpen, AlertCircle } from 'lucide-react';
import { SovraAvatar } from './SovraAvatar';
import type { SovraMessage, ToolAction } from '@/hooks/useSovraChat';
import { cn } from '@/lib/utils';

interface SovraMessagesProps {
  messages: SovraMessage[];
  isStreaming: boolean;
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

export function SovraMessages({ messages, isStreaming }: SovraMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const showCursor = isStreaming && isLast && msg.role === 'assistant';

        if (msg.role === 'tool_results' && msg.actions) {
          return (
            <div key={i} className="flex justify-start gap-3">
              <div className="w-8" /> {/* Spacer matching avatar width */}
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

        return (
          <div key={i} className="flex justify-start gap-3">
            <SovraAvatar size="sm" className="mt-1" />
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[70%] text-sm shadow-sm">
              {msg.content ? (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : null}
              {showCursor && (
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom rounded-sm" />
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
