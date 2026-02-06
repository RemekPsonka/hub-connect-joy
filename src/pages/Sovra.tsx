import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SovraSidebar } from '@/components/sovra/SovraSidebar';
import { SovraWelcome } from '@/components/sovra/SovraWelcome';
import { SovraMessages } from '@/components/sovra/SovraMessages';
import { SovraInput } from '@/components/sovra/SovraInput';
import { useSovraChat } from '@/hooks/useSovraChat';
import { useSovraSessions } from '@/hooks/useSovraSessions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useContextFromURL() {
  const [searchParams, setSearchParams] = useSearchParams();
  const contextType = searchParams.get('context') || undefined;
  const contextId = searchParams.get('id') || undefined;

  const clearContext = useCallback(() => {
    searchParams.delete('context');
    searchParams.delete('id');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return { contextType, contextId, clearContext };
}

function useContextLabel(contextType?: string, contextId?: string) {
  return useQuery({
    queryKey: ['sovra-context-label', contextType, contextId],
    queryFn: async () => {
      if (!contextType || !contextId) return null;

      if (contextType === 'project') {
        const { data } = await supabase.from('projects').select('name').eq('id', contextId).single();
        return data ? `Projekt: ${data.name}` : null;
      }
      if (contextType === 'contact') {
        const { data } = await supabase.from('contacts').select('full_name').eq('id', contextId).single();
        return data ? `Kontakt: ${data.full_name}` : null;
      }
      if (contextType === 'task') {
        const { data } = await supabase.from('tasks').select('title').eq('id', contextId).single();
        return data ? `Zadanie: ${data.title}` : null;
      }
      return null;
    },
    enabled: !!contextType && !!contextId,
    staleTime: 5 * 60 * 1000,
  });
}

export default function Sovra() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();

  const { contextType, contextId, clearContext } = useContextFromURL();
  const { data: contextLabel } = useContextLabel(contextType, contextId);

  const {
    messages,
    isStreaming,
    sessionId,
    sendMessage,
    loadSession,
    newSession,
  } = useSovraChat({ contextType, contextId });

  const { data: sessions = [], isLoading: sessionsLoading } = useSovraSessions();

  const handleSend = useCallback((text: string) => {
    sendMessage(text, contextType, contextId);
  }, [sendMessage, contextType, contextId]);

  const handleNewSession = useCallback(() => {
    newSession();
    setMobileOpen(false);
  }, [newSession]);

  const handleSelectSession = useCallback((id: string) => {
    loadSession(id);
    setMobileOpen(false);
  }, [loadSession]);

  // Invalidate sessions list when sessionId changes (new session created)
  useEffect(() => {
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ['sovra-sessions'] });
    }
  }, [sessionId, queryClient]);

  const sidebarContent = (
    <SovraSidebar
      sessions={sessions}
      isLoading={sessionsLoading}
      activeSessionId={sessionId}
      onNewSession={handleNewSession}
      onSelectSession={handleSelectSession}
    />
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="sr-only">
                <SheetTitle>Historia rozmów</SheetTitle>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">Sovra</span>
        </div>

        {/* Messages or welcome */}
        {messages.length === 0 ? (
          <SovraWelcome onQuickAction={handleSend} />
        ) : (
          <SovraMessages messages={messages} isStreaming={isStreaming} />
        )}

        {/* Input */}
        <SovraInput
          onSend={handleSend}
          isStreaming={isStreaming}
          contextLabel={contextLabel}
          onClearContext={contextType ? clearContext : undefined}
        />
      </div>
    </div>
  );
}
