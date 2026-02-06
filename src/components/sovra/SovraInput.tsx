import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SovraInputProps {
  onSend: (text: string) => void;
  isStreaming: boolean;
  contextLabel?: string | null;
  onClearContext?: () => void;
}

export function SovraInput({ onSend, isStreaming, contextLabel, onClearContext }: SovraInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'; // max ~4 lines
  }, []);

  return (
    <div className="border-t border-border bg-card px-4 sm:px-6 py-4">
      {contextLabel && (
        <div className="bg-primary/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>Kontekst: <span className="font-medium text-foreground">{contextLabel}</span></span>
          {onClearContext && (
            <button
              onClick={onClearContext}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder="Napisz do Sovry..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 transition-colors"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || isStreaming}
          className="rounded-lg h-10 w-10 shrink-0"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
