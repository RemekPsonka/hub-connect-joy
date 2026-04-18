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
import { SovraModeSelector, type SovraMode } from '@/components/sovra/SovraModeSelector';
import { SovraDebrief } from '@/components/sovra/SovraDebrief';
import { SovraMorningBrief } from '@/components/sovra/SovraMorningBrief';
import { useSovraChat } from '@/hooks/useSovraChat';
import { useSovraSessions } from '@/hooks/useSovraSessions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

function useURLParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const contextType = searchParams.get('context') || undefined;
  const contextId = searchParams.get('id') || undefined;
  const modeParam = searchParams.get('mode') as SovraMode | null;
  const eventParam = searchParams.get('event') || undefined;
  const calendarParam = searchParams.get('calendar') || undefined;

  const clearContext = useCallback(() => {
    searchParams.delete('context');
    searchParams.delete('id');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const clearModeParams = useCallback(() => {
    searchParams.delete('mode');
    searchParams.delete('event');
    searchParams.delete('calendar');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return { contextType, contextId, modeParam, eventParam, calendarParam, clearContext, clearModeParams };
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

  const { contextType, contextId, modeParam, eventParam, calendarParam, clearContext, clearModeParams } = useURLParams();
  const { data: contextLabel } = useContextLabel(contextType, contextId);

  // Mode state — initialized from URL params
  const [mode, setMode] = useState<SovraMode>(() => {
    if (modeParam === 'debrief' || modeParam === 'morning') return modeParam;
    return 'chat';
  });

  // Clear mode URL params once consumed
  useEffect(() => {
    if (modeParam) clearModeParams();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    messages,
    isStreaming,
    sessionId,
    sendMessage,
    confirmAction,
    loadSession,
    newSession,
  } = useSovraChat({ contextType, contextId });

  const { data: sessions = [], isLoading: sessionsLoading } = useSovraSessions();

  const handleSend = useCallback((text: string) => {
    sendMessage(text, contextType, contextId);
  }, [sendMessage, contextType, contextId]);

  const handleNewSession = useCallback(() => {
    newSession();
    setMode('chat');
    setMobileOpen(false);
  }, [newSession]);

  const handleSelectSession = useCallback((id: string) => {
    loadSession(id);
    setMode('chat');
    setMobileOpen(false);
  }, [loadSession]);

  const handleModeChange = useCallback((newMode: SovraMode) => {
    setMode(newMode);
  }, []);

  const handleSwitchToChat = useCallback((sid: string) => {
    loadSession(sid);
    setMode('chat');
  }, [loadSession]);

  // Invalidate sessions list when sessionId changes
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

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header + mode selector */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
          <div className="md:hidden">
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
          </div>
          <SovraModeSelector mode={mode} onModeChange={handleModeChange} />
        </div>

        {/* Content based on mode */}
        {mode === 'chat' && (
          <>
            {messages.length === 0 ? (
              <SovraWelcome onQuickAction={handleSend} />
            ) : (
              <SovraMessages messages={messages} isStreaming={isStreaming} onConfirm={confirmAction} />
            )}
            <SovraInput
              onSend={handleSend}
              isStreaming={isStreaming}
              contextLabel={contextLabel}
              onClearContext={contextType ? clearContext : undefined}
            />
          </>
        )}

        {mode === 'debrief' && (
          <SovraDebrief
            initialEventId={eventParam}
            initialCalendarId={calendarParam}
            initialProjectId={contextType === 'project' ? contextId : undefined}
            onSwitchToChat={handleSwitchToChat}
          />
        )}

        {mode === 'morning' && (
          <SovraMorningBrief onSwitchToChat={handleSwitchToChat} />
        )}
      </div>
    </div>
  );
}
