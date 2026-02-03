import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RemekMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
  helpfulRating?: number;
}

interface RemekContext {
  module: string | null;
  pageUrl: string;
  contactId?: string;
  companyId?: string;
}

interface RemekResponse {
  message: string;
  messageId?: string;
  sessionId: string;
  suggestedArticles?: Array<{ title: string; module: string }>;
  canReportBug: boolean;
}

const MODULE_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/contacts': 'contacts',
  '/companies': 'companies',
  '/consultations': 'consultations',
  '/meetings': 'meetings',
  '/tasks': 'tasks',
  '/ai': 'ai_chat',
  '/network': 'network',
  '/search': 'search',
  '/settings': 'settings',
  '/bug-reports': 'bug_reports',
  '/representatives': 'representatives',
  '/pipeline': 'pipeline',
  '/analytics': 'analytics',
  '/matches': 'matches',
  '/notifications': 'notifications',
  '/owner': 'owner',
  '/superadmin': 'superadmin',
};

const WELCOME_MESSAGES: Record<string, string> = {
  dashboard: "Cześć! 👋 Widzę że jesteś na dashboardzie. Mogę pomóc zrozumieć statystyki lub podpowiedzieć co zrobić dalej.",
  contacts: "Hej! 📇 Jesteś w module kontaktów. Chcesz wiedzieć jak dodać kontakt, importować z LinkedIn, lub wyszukać kogoś?",
  companies: "Cześć! 🏭 Widzę że przeglądasz firmy. Mogę pomóc z enrichmentem danych, analizą KRS, lub profilem AI firmy.",
  ai_chat: "👋 Widzisz chat z AI — tutaj rozmawiasz z Master Agentem o swojej sieci. Ja (Remek) pomagam z SYSTEMEM, a AI Chat analizuje Twoje DANE.",
  consultations: "Hej! 🤝 Jesteś w module konsultacji. Mogę pomóc zaplanować spotkanie lub przygotować brief.",
  meetings: "Cześć! 📅 Widzę że przeglądasz spotkania. Chcesz utworzyć nowe spotkanie grupowe?",
  tasks: "Hej! ✅ Jesteś w module zadań. Mogę pomóc z tworzeniem, filtrowaniem lub kategoryzacją zadań.",
  network: "Cześć! 🌐 Widzisz graf sieci. Masz pytania o wizualizację lub połączenia między kontaktami?",
  search: "Hej! 🔍 Jesteś w wyszukiwarce. Mogę wyjaśnić jak działa wyszukiwanie semantyczne.",
  settings: "Cześć! ⚙️ Widzę że jesteś w ustawieniach. Mogę pomóc z konfiguracją grup, 2FA, lub innych opcji.",
  bug_reports: "Hej! 🐛 Jesteś w zgłoszeniach błędów. Widzisz coś niepokojącego? Mogę pomóc przygotować zgłoszenie.",
  default: "Cześć! 🤖 Jestem Remek — Twój asystent systemu. Zapytaj mnie o cokolwiek związanego z obsługą CRM!",
};

const SESSION_STORAGE_KEY = 'remek_session_id';

export function useRemekChat() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, director, assistant } = useAuth();
  const tenantId = director?.tenant_id || assistant?.tenant_id;
  
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  
  // Get or create session ID
  const [sessionId] = useState<string>(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  });

  // Detect current module from URL
  const getCurrentModule = useCallback((): string | null => {
    const pathname = location.pathname;
    
    // Check exact matches first
    if (MODULE_MAP[pathname]) {
      return MODULE_MAP[pathname];
    }
    
    // Check prefix matches (e.g., /contacts/123 → contacts)
    for (const [path, module] of Object.entries(MODULE_MAP)) {
      if (path !== '/' && pathname.startsWith(path)) {
        return module;
      }
    }
    
    return null;
  }, [location.pathname]);

  const currentModule = getCurrentModule();

  // Get context for current page
  const getContext = useCallback((): RemekContext => {
    const pathname = location.pathname;
    const context: RemekContext = {
      module: currentModule,
      pageUrl: window.location.href,
    };

    // Extract IDs from URL if present
    const contactMatch = pathname.match(/\/contacts\/([a-f0-9-]+)/);
    if (contactMatch) {
      context.contactId = contactMatch[1];
    }

    const companyMatch = pathname.match(/\/companies\/([a-f0-9-]+)/);
    if (companyMatch) {
      context.companyId = companyMatch[1];
    }

    return context;
  }, [location.pathname, currentModule]);

  // Fetch conversation history
  const { data: messages = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['remek-conversations', sessionId, tenantId],
    queryFn: async (): Promise<RemekMessage[]> => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('remek_conversations')
        .select('id, role, message, created_at, helpful_rating')
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching Remek history:', error);
        return [];
      }

      return (data || []).map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        message: msg.message,
        createdAt: msg.created_at,
        helpfulRating: msg.helpful_rating || undefined,
      }));
    },
    enabled: !!tenantId && !!user,
    staleTime: 0,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string): Promise<RemekResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('remek-chat', {
        body: {
          message: text,
          sessionId,
          context: getContext(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send message');
      }

      return response.data as RemekResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remek-conversations', sessionId] });
    },
    onError: (error) => {
      console.error('Remek chat error:', error);
      toast.error('Nie udało się wysłać wiadomości. Spróbuj ponownie.');
    },
  });

  // Rate message mutation
  const rateMessageMutation = useMutation({
    mutationFn: async ({ messageId, rating }: { messageId: string; rating: number }) => {
      const { error } = await supabase
        .from('remek_conversations')
        .update({ helpful_rating: rating })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remek-conversations', sessionId] });
      toast.success('Dziękuję za ocenę!');
    },
  });

  // Clear session
  const clearSession = useCallback(() => {
    const newId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, newId);
    queryClient.invalidateQueries({ queryKey: ['remek-conversations'] });
    window.location.reload(); // Simplest way to reset state
  }, [queryClient]);

  // Get welcome message for current module
  const getWelcomeMessage = useCallback((): string => {
    if (currentModule && WELCOME_MESSAGES[currentModule]) {
      return WELCOME_MESSAGES[currentModule];
    }
    return WELCOME_MESSAGES.default;
  }, [currentModule]);

  // Get conversation snapshot for bug reports
  const getConversationSnapshot = useCallback(() => {
    return messages.slice(-20).map((msg) => ({
      role: msg.role,
      message: msg.message,
      createdAt: msg.createdAt,
    }));
  }, [messages]);

  return {
    sessionId,
    messages,
    isLoading: sendMessageMutation.isPending,
    isLoadingHistory,
    sendMessage: (text: string) => sendMessageMutation.mutateAsync(text),
    reportBug: () => setReportModalOpen(true),
    currentModule,
    clearSession,
    rateMessage: (messageId: string, rating: number) => 
      rateMessageMutation.mutate({ messageId, rating }),
    isReportModalOpen,
    setReportModalOpen,
    getWelcomeMessage,
    getContext,
    getConversationSnapshot,
  };
}
