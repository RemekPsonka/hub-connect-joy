import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { streamAIChat } from '@/hooks/useAIChat';
import { 
  useConsultationChatMessages, 
  useCreateChatMessage, 
  useClearChatMessages 
} from '@/hooks/useConsultationQuestionnaire';
import { ConsultationWithContact } from '@/hooks/useConsultations';

interface ConsultationBriefChatProps {
  consultation: ConsultationWithContact;
}

export function ConsultationBriefChat({ consultation }: ConsultationBriefChatProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const { data: messages = [], isLoading } = useConsultationChatMessages(consultation.id, 'brief');
  const createMessage = useCreateChatMessage();
  const clearMessages = useClearChatMessages();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const generateInitialBrief = async () => {
    setIsGenerating(true);
    setStreamingContent('');

    try {
      // Gather context from database
      const [pastConsultationsResult, tasksResult, needsResult, offersResult, matchesResult] = await Promise.all([
        supabase
          .from('consultations')
          .select('scheduled_at, agenda, notes, ai_summary')
          .eq('contact_id', consultation.contact_id)
          .neq('id', consultation.id)
          .order('scheduled_at', { ascending: false })
          .limit(3),
        supabase
          .from('tasks')
          .select('title, description, due_date, priority, status')
          .eq('consultation_id', consultation.id)
          .in('status', ['pending', 'in_progress'])
          .limit(5),
        supabase
          .from('needs')
          .select('title, description, priority, status')
          .eq('contact_id', consultation.contact_id)
          .eq('status', 'active')
          .limit(5),
        supabase
          .from('offers')
          .select('title, description, status')
          .eq('contact_id', consultation.contact_id)
          .eq('status', 'active')
          .limit(5),
        supabase
          .from('matches')
          .select(`
            similarity_score, ai_explanation,
            need:needs(title, description, contact:contacts(full_name, company)),
            offer:offers(title, description, contact:contacts(full_name, company))
          `)
          .or(`needs.contact_id.eq.${consultation.contact_id},offers.contact_id.eq.${consultation.contact_id}`)
          .in('status', ['pending', 'suggested'])
          .order('similarity_score', { ascending: false })
          .limit(5)
      ]);

      const pastConsultations = pastConsultationsResult.data || [];
      const tasks = tasksResult.data || [];
      const needs = needsResult.data || [];
      const offers = offersResult.data || [];
      const matches = matchesResult.data || [];

      // Build comprehensive prompt
      const prompt = `Jesteś asystentem networkingowym przygotowującym brief przed spotkaniem biznesowym (Konsultacja Indywidualna CC).

KONTEKST SPOTKANIA:
Data: ${new Date(consultation.scheduled_at).toLocaleDateString('pl-PL')}
Czas: ${new Date(consultation.scheduled_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
Cel: ${consultation.agenda || 'Brak określonej agendy'}
Lokalizacja: ${consultation.is_virtual ? 'Online' : consultation.location || 'Do ustalenia'}

PROFIL CZŁONKA CC:
Imię i nazwisko: ${consultation.contacts.full_name}
Firma: ${consultation.contacts.company || 'Nie podano'}
Stanowisko: ${consultation.contacts.position || 'Nie podano'}
Email: ${consultation.contacts.email || 'Nie podano'}

${pastConsultations.length > 0 ? `
HISTORIA KONSULTACJI (ostatnie ${pastConsultations.length}):
${pastConsultations.map((c, i) => `
${i + 1}. ${new Date(c.scheduled_at).toLocaleDateString('pl-PL')}
   Agenda: ${c.agenda || 'Brak'}
   Notatki: ${c.notes || 'Brak'}
   Podsumowanie: ${c.ai_summary || 'Brak'}
`).join('')}
` : 'Brak wcześniejszych konsultacji.'}

${tasks.length > 0 ? `
OTWARTE ZADANIA:
${tasks.map((t, i) => `${i + 1}. [${t.priority?.toUpperCase() || 'MEDIUM'}] ${t.title}${t.due_date ? ` - termin: ${t.due_date}` : ''}`).join('\n')}
` : ''}

${needs.length > 0 ? `
AKTYWNE POTRZEBY CZŁONKA:
${needs.map((n, i) => `${i + 1}. ${n.title}${n.description ? ` - ${n.description}` : ''}`).join('\n')}
` : ''}

${offers.length > 0 ? `
AKTYWNE OFERTY CZŁONKA:
${offers.map((o, i) => `${i + 1}. ${o.title}${o.description ? ` - ${o.description}` : ''}`).join('\n')}
` : ''}

${matches.length > 0 ? `
SUGEROWANE POŁĄCZENIA BIZNESOWE (potencjalne rekomendacje):
${matches.map((m: any, i) => {
  const need = m.need;
  const offer = m.offer;
  if (!need || !offer) return '';
  return `${i + 1}. ${need.contact?.full_name || 'Nieznany'} (${need.contact?.company || '?'}) potrzebuje "${need.title}" - ${offer.contact?.full_name || 'Nieznany'} (${offer.contact?.company || '?'}) oferuje "${offer.title}" (dopasowanie: ${Math.round((m.similarity_score || 0) * 100)}%)`;
}).filter(Boolean).join('\n')}
` : ''}

ZADANIE:
Przygotuj profesjonalny brief przed Konsultacją Indywidualną (KI) zgodnie z metodologią Corporate Connections.

Struktura briefu:
1. **Podsumowanie kontekstu** (2-3 zdania)
   - Kim jest ten Członek CC i jaki jest cel spotkania

2. **Kluczowe tematy do omówienia** (3-5 punktów)
   - Odniesienie do wcześniejszych ustaleń (jeśli były)
   - Aktualne wyzwania biznesowe
   - Postęp w realizacji zadań

3. **Pytania do zadania** (3-5 konkretnych pytań)
   - "Co obecnie najbardziej angażuje Cię czasowo?"
   - "Które cele biznesowe wymagają wsparcia?"
   - "Jakich strategicznych partnerów poszukujesz?"

4. **Sugerowane połączenia do zaproponowania** (jeśli są dopasowania)
   - Konkretne rekomendacje: "Połącz X z Y bo..."

5. **Monitoring aktywności do omówienia**
   - Spotkania 1 na 1
   - Przekazane/otrzymane rekomendacje
   - Goście zaproszeni na Grupę CC

6. **Następne kroki**
   - Konkretne action items do ustalenia

Format: Markdown, zwięźle, profesjonalnie.
Język: Polski.`;

      let fullResponse = '';

      await streamAIChat({
        messages: [{ role: 'user', content: prompt }],
        onDelta: (text) => {
          fullResponse += text;
          setStreamingContent(fullResponse);
        },
        onDone: async () => {
          // Save to database
          await createMessage.mutateAsync({
            consultation_id: consultation.id,
            chat_type: 'brief',
            role: 'assistant',
            content: fullResponse,
          });
          setStreamingContent('');
          setIsGenerating(false);
        },
        onError: (error) => {
          console.error('Brief generation error:', error);
          toast({
            title: 'Błąd',
            description: 'Nie udało się wygenerować briefu',
            variant: 'destructive',
          });
          setIsGenerating(false);
          setStreamingContent('');
        },
      });

    } catch (error) {
      console.error('Brief generation error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować briefu',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsGenerating(true);
    setStreamingContent('');

    try {
      // Save user message
      await createMessage.mutateAsync({
        consultation_id: consultation.id,
        chat_type: 'brief',
        role: 'user',
        content: userMessage,
      });

      // Build context from previous messages
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      let fullResponse = '';

      await streamAIChat({
        messages: [
          { role: 'system', content: `Jesteś asystentem networkingowym pomagającym przygotować się do Konsultacji Indywidualnej z ${consultation.contacts.full_name} (${consultation.contacts.company || 'firma nieznana'}). Odpowiadaj po polsku, zwięźle i profesjonalnie.` },
          ...chatHistory,
          { role: 'user', content: userMessage },
        ],
        onDelta: (text) => {
          fullResponse += text;
          setStreamingContent(fullResponse);
        },
        onDone: async () => {
          await createMessage.mutateAsync({
            consultation_id: consultation.id,
            chat_type: 'brief',
            role: 'assistant',
            content: fullResponse,
          });
          setStreamingContent('');
          setIsGenerating(false);
        },
        onError: (error) => {
          console.error('Chat error:', error);
          toast({
            title: 'Błąd',
            description: 'Nie udało się uzyskać odpowiedzi',
            variant: 'destructive',
          });
          setIsGenerating(false);
          setStreamingContent('');
        },
      });

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać wiadomości',
        variant: 'destructive',
      });
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await clearMessages.mutateAsync({ consultationId: consultation.id, chatType: 'brief' });
    generateInitialBrief();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Brief Przygotowawczy AI
          </CardTitle>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regeneruj
              </Button>
            )}
            {messages.length === 0 && !isGenerating && (
              <Button onClick={generateInitialBrief} size="sm">
                <Sparkles className="h-4 w-4 mr-1" />
                Generuj brief
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !isGenerating && !streamingContent && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                Kliknij "Generuj brief" aby AI przygotowało informacje przed spotkaniem
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`rounded-lg p-3 max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                  {message.content}
                </div>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Streaming content */}
          {streamingContent && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert">
                  {streamingContent}
                </div>
              </div>
            </div>
          )}

          {isGenerating && !streamingContent && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zapytaj AI o więcej szczegółów..."
            disabled={isGenerating || messages.length === 0}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isGenerating || messages.length === 0}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
