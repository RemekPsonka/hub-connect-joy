import { useState, useRef, useEffect } from 'react';
import { Send, Play, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useBIData, useBIInterview, useActiveSession } from '@/hooks/useBIInterview';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  speaker: 'user' | 'agent';
  message: string;
  timestamp: Date;
}

interface BIInterviewChatProps {
  contactId: string;
  contactName: string;
  tenantId?: string;
}

export function BIInterviewChat({ contactId, contactName, tenantId }: BIInterviewChatProps) {
  const { data: biData, isLoading: biLoading } = useBIData(contactId);
  const { data: activeSession } = useActiveSession(biData?.id);
  const { mutateAsync: sendMessage, isPending } = useBIInterview();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState(0);
  const [status, setStatus] = useState<'idle' | 'in_progress' | 'paused' | 'completed'>('idle');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load existing session data
  useEffect(() => {
    if (activeSession) {
      setSessionId(activeSession.id);
      setStatus(activeSession.status as any);
      
      // Load conversation history
      const history = activeSession.conversation_log || [];
      setMessages(history.map((msg, idx) => ({
        id: `${idx}`,
        speaker: msg.speaker,
        message: msg.message,
        timestamp: new Date(msg.timestamp)
      })));
    }
  }, [activeSession]);

  // Update completeness from BI data
  useEffect(() => {
    if (biData) {
      setCompleteness((biData.completeness_score || 0) * 100);
      if (biData.bi_status === 'complete') {
        setStatus('completed');
      }
    }
  }, [biData]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startInterview = async () => {
    try {
      setStatus('in_progress');
      
      const response = await sendMessage({
        contactId,
        sessionId: null,
        userMessage: 'START_INTERVIEW',
        tenantId
      });
      
      setSessionId(response.session_id);
      setCompleteness(response.completeness * 100);
      setStatus(response.status);
      
      // Add agent's opening message
      setMessages([{
        id: Date.now().toString(),
        speaker: 'agent',
        message: response.agent_message,
        timestamp: new Date()
      }]);
      
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to start interview:', error);
      setStatus('idle');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isPending) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const userMsg: Message = {
      id: Date.now().toString(),
      speaker: 'user',
      message: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const response = await sendMessage({
        contactId,
        sessionId,
        userMessage,
        tenantId
      });
      
      setSessionId(response.session_id);
      setCompleteness(response.completeness * 100);
      setStatus(response.status);
      
      // Add agent response
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        speaker: 'agent',
        message: response.agent_message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMsg]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        speaker: 'agent',
        message: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.',
        timestamp: new Date()
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resumeInterview = () => {
    setStatus('in_progress');
    inputRef.current?.focus();
  };

  if (biLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Wywiad BI: {contactName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Strukturalny wywiad biznesowy
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={status === 'completed' ? 'default' : status === 'in_progress' ? 'secondary' : 'outline'}
            >
              {status === 'completed' ? 'Ukończony' : 
               status === 'in_progress' ? 'W trakcie' : 
               status === 'paused' ? 'Wstrzymany' : 'Nierozpoczęty'}
            </Badge>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Kompletność danych</span>
            <span className="font-medium">{Math.round(completeness)}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {status === 'idle' && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Rozpocznij wywiad BI</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Agent AI przeprowadzi z Tobą strukturalny wywiad biznesowy, 
              zbierając kompleksowe informacje o kontakcie w 6 kategoriach.
            </p>
            <Button onClick={startInterview} size="lg">
              <Play className="h-4 w-4 mr-2" />
              Rozpocznij wywiad
            </Button>
          </div>
        ) : status === 'completed' ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Wywiad ukończony!</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Zebrano {Math.round(completeness)}% danych. Możesz przeglądać dane w zakładce "Dane BI" 
              lub przeprowadzić aktualizację.
            </p>
            <Button onClick={startInterview} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Przeprowadź aktualizację
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full px-4">
            <div ref={scrollRef} className="space-y-4 py-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 ${msg.speaker === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={msg.speaker === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                      {msg.speaker === 'user' ? 'Ty' : 'BI'}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      msg.speaker === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-xs mt-1 ${
                      msg.speaker === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {msg.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isPending && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-muted">BI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Agent analizuje...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {(status === 'in_progress' || status === 'paused') && (
        <CardFooter className="border-t p-4">
          {status === 'paused' ? (
            <div className="w-full flex items-center justify-center gap-4">
              <p className="text-sm text-muted-foreground">Wywiad wstrzymany</p>
              <Button onClick={resumeInterview}>
                <Play className="h-4 w-4 mr-2" />
                Wznów
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napisz odpowiedź..."
                className="min-h-[60px] resize-none"
                disabled={isPending}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isPending}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
