import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircleQuestion, X, Send, RotateCcw, Bug, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useRemekChat } from '@/hooks/useRemekChat';
import { RemekBugReportModal } from './RemekBugReportModal';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { label: '📋 Jak dodać kontakt?', message: 'Jak dodać nowy kontakt?' },
  { label: '🔍 Jak wyszukiwać?', message: 'Jak wyszukać kontakt w systemie?' },
  { label: '🐛 Zgłoś problem', action: 'report' as const },
];

export function RemekChatWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    messages,
    isLoading,
    isLoadingHistory,
    sendMessage,
    currentModule,
    clearSession,
    rateMessage,
    isReportModalOpen,
    setReportModalOpen,
    getWelcomeMessage,
    sessionId,
    getConversationSnapshot,
    getContext,
  } = useRemekChat();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    
    setInputValue('');
    try {
      await sendMessage(text);
    } catch {
      // Error handled in hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: { label: string; message?: string; action?: 'report' }) => {
    if (action.action === 'report') {
      setReportModalOpen(true);
    } else if (action.message) {
      sendMessage(action.message);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-24 right-6 z-50 rounded-full p-4 shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-200 cursor-pointer",
          "flex items-center justify-center",
          isOpen && "rotate-90"
        )}
        type="button"
        aria-label="Otwórz asystenta Remka"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircleQuestion className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 z-50 w-[500px] max-w-[calc(100vw-3rem)] bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  🤖
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">AI Remek</h3>
                <p className="text-xs text-muted-foreground">Asystent Systemu</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearSession}
                title="Nowa rozmowa"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 h-[450px] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Welcome message (only if no messages) */}
              {!hasMessages && !isLoadingHistory && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-sm">🤖</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg rounded-tl-none p-3 text-sm max-w-[85%]">
                    {getWelcomeMessage()}
                  </div>
                </div>
              )}

              {/* Loading history indicator */}
              {isLoadingHistory && (
                <div className="flex justify-center py-4">
                  <div className="animate-pulse text-muted-foreground text-sm">
                    Ładowanie historii...
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' && "flex-row-reverse"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-muted text-sm">🤖</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-lg p-3 text-sm max-w-[85%]",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted rounded-tl-none"
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            h2: ({ children }) => <h2 className="font-semibold text-base mt-3 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="font-semibold text-sm mt-2 mb-1">{children}</h3>,
                            a: ({ href, children }) => {
                              const handleClick = (e: React.MouseEvent) => {
                                e.preventDefault();
                                if (href?.startsWith('/')) {
                                  navigate(href);
                                } else if (href) {
                                  window.open(href, '_blank', 'noopener,noreferrer');
                                }
                              };
                              return (
                                <a 
                                  href={href} 
                                  onClick={handleClick}
                                  className="text-primary underline hover:text-primary/80 cursor-pointer"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {msg.message}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.message
                    )}
                    
                    {/* Rating buttons for assistant messages */}
                    {msg.role === 'assistant' && !msg.helpfulRating && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground mr-1">Pomocne?</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => rateMessage(msg.id, 5)}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => rateMessage(msg.id, 1)}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {msg.helpfulRating && (
                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                        {msg.helpfulRating >= 4 ? '👍 Dziękuję!' : '👎 Przepraszam, postaram się lepiej.'}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-sm">🤖</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg rounded-tl-none p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick actions */}
          <div className="px-4 py-2 border-t flex gap-2 flex-wrap">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => handleQuickAction(action)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                disabled={isLoading}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zapytaj Remka o cokolwiek..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bug report modal */}
      <RemekBugReportModal
        open={isReportModalOpen}
        onOpenChange={setReportModalOpen}
        sessionId={sessionId}
        conversationSnapshot={getConversationSnapshot()}
        userContext={getContext()}
      />
    </>
  );
}
