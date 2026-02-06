import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { SovraAvatar } from './SovraAvatar';
import type { SovraMessage } from '@/hooks/useSovraChat';

interface SovraMessagesProps {
  messages: SovraMessage[];
  isStreaming: boolean;
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
