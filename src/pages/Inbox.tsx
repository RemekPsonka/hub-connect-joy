import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DOMPurify from 'isomorphic-dompurify';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Mail, Inbox as InboxIcon, Send, Tag, Search as SearchIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useGmailThreads,
  useGmailThread,
  useGmailLabels,
  type ThreadFilters,
} from '@/hooks/useGmailThreads';
import { useGmailOutbox } from '@/hooks/useGmail';
import { ComposeEmailModal } from '@/components/email/ComposeEmailModal';
import { useQueryClient } from '@tanstack/react-query';

const SYSTEM_LABEL_NAMES: Record<string, string> = {
  INBOX: 'Odebrane',
  STARRED: 'Z gwiazdką',
  IMPORTANT: 'Ważne',
  SENT: 'Wysłane',
  DRAFT: 'Szkice',
  TRASH: 'Kosz',
  SPAM: 'Spam',
  UNREAD: 'Nieprzeczytane',
};

function fmtDate(d: string | null) {
  if (!d) return '';
  try {
    return format(new Date(d), 'dd MMM HH:mm', { locale: pl });
  } catch {
    return '';
  }
}

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'a', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'inbox' | 'sent'>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInit, setComposeInit] = useState<{ to?: string; subject?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const labelFilter = params.get('label') ?? undefined;
  const unreadOnly = params.get('unread') === '1';
  const selectedThreadId = params.get('thread') ?? undefined;

  const filters: ThreadFilters = useMemo(
    () => ({ labelId: labelFilter, unreadOnly, search }),
    [labelFilter, unreadOnly, search],
  );

  const { data: labels } = useGmailLabels();
  const { data: threads, isLoading: threadsLoading } = useGmailThreads(filters);
  const { data: outbox } = useGmailOutbox();
  const { data: messages } = useGmailThread(selectedThreadId);

  const setLabel = (label?: string) => {
    const next = new URLSearchParams(params);
    if (label) next.set('label', label);
    else next.delete('label');
    next.delete('unread');
    next.delete('thread');
    setParams(next);
  };

  const setUnread = () => {
    const next = new URLSearchParams(params);
    next.set('unread', '1');
    next.delete('label');
    next.delete('thread');
    setParams(next);
  };

  const selectThread = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('thread', id);
    setParams(next);
  };

  const handleReply = () => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    setComposeInit({
      to: last.from ?? undefined,
      subject: last.subject?.startsWith('Re:') ? last.subject : `Re: ${last.subject ?? ''}`,
    });
    setComposeOpen(true);
  };

  const runFullSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-full-sync', { body: { days_back: 30 } });
      if (error) throw error;
      toast.success(`Zsynchronizowano ${data?.processed ?? 0} wiadomości`);
      queryClient.invalidateQueries({ queryKey: ['gmail-threads'] });
      queryClient.invalidateQueries({ queryKey: ['gmail-labels'] });
    } catch (e) {
      toast.error(`Błąd synchronizacji: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  const userLabels = (labels ?? []).filter((l) => l.type === 'user');
  const systemLabels = (labels ?? []).filter((l) => l.type === 'system' && ['INBOX', 'STARRED', 'IMPORTANT'].includes(l.gmail_label_id));

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left sidebar */}
      <aside className="w-60 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b space-y-2">
          <Button className="w-full" onClick={() => { setComposeInit(null); setComposeOpen(true); }}>
            <Mail className="mr-2 h-4 w-4" /> Nowy e-mail
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={runFullSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> Synchronizuj
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <button
              onClick={() => { setLabel(undefined); setView('inbox'); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-muted ${!labelFilter && !unreadOnly && view === 'inbox' ? 'bg-muted font-medium' : ''}`}
            >
              <InboxIcon className="h-4 w-4" /> Wszystkie
            </button>
            <button
              onClick={() => { setUnread(); setView('inbox'); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-muted ${unreadOnly ? 'bg-muted font-medium' : ''}`}
            >
              <Mail className="h-4 w-4" /> Nieprzeczytane
            </button>
            <button
              onClick={() => setView('sent')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-muted ${view === 'sent' ? 'bg-muted font-medium' : ''}`}
            >
              <Send className="h-4 w-4" /> Wysłane
            </button>
            {systemLabels.length > 0 && (
              <div className="pt-3">
                <div className="px-3 text-xs uppercase text-muted-foreground mb-1">Systemowe</div>
                {systemLabels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLabel(l.gmail_label_id); setView('inbox'); }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-muted ${labelFilter === l.gmail_label_id ? 'bg-muted font-medium' : ''}`}
                  >
                    <Tag className="h-3.5 w-3.5" /> {SYSTEM_LABEL_NAMES[l.gmail_label_id] ?? l.name}
                  </button>
                ))}
              </div>
            )}
            {userLabels.length > 0 && (
              <div className="pt-3">
                <div className="px-3 text-xs uppercase text-muted-foreground mb-1">Etykiety</div>
                {userLabels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLabel(l.gmail_label_id); setView('inbox'); }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-muted ${labelFilter === l.gmail_label_id ? 'bg-muted font-medium' : ''}`}
                  >
                    <Tag className="h-3.5 w-3.5" style={{ color: l.color?.backgroundColor }} /> {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Middle: thread list */}
      <section className="w-[28rem] border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj w temacie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {view === 'sent' ? (
            <div className="divide-y">
              {(outbox ?? []).map((m) => (
                <div key={m.id} className="p-3 hover:bg-muted/50 cursor-default">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-sm truncate">{m.to}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDate(m.sent_at ?? m.created_at)}</span>
                  </div>
                  <div className="text-sm truncate">{m.subject}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.body_plain?.slice(0, 80)}</div>
                  <Badge variant={m.status === 'sent' ? 'default' : m.status === 'failed' ? 'destructive' : 'secondary'} className="mt-1">
                    {m.status}
                  </Badge>
                </div>
              ))}
              {(!outbox || outbox.length === 0) && (
                <div className="p-6 text-center text-sm text-muted-foreground">Brak wysłanych wiadomości</div>
              )}
            </div>
          ) : threadsLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="divide-y">
              {(threads ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectThread(t.id)}
                  className={`w-full text-left p-3 hover:bg-muted/50 ${selectedThreadId === t.id ? 'bg-muted' : ''} ${t.is_unread ? 'font-semibold' : ''}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm truncate">{t.subject || '(bez tematu)'}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fmtDate(t.last_message_at)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{t.snippet}</div>
                  {t.is_unread && <Badge variant="default" className="mt-1 text-xs">nowe</Badge>}
                </button>
              ))}
              {threads && threads.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Brak wiadomości. Kliknij „Synchronizuj" aby pobrać z Gmail.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </section>

      {/* Right: message panel */}
      <main className="flex-1 flex flex-col">
        {selectedThreadId && messages && messages.length > 0 ? (
          <>
            <div className="p-4 border-b flex justify-between items-start gap-3">
              <h2 className="text-lg font-semibold">{messages[0].subject || '(bez tematu)'}</h2>
              <Button size="sm" onClick={handleReply}>Odpowiedz</Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {messages.map((m) => (
                  <Card key={m.id} className="p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <div>
                        <div className="font-medium">{m.from}</div>
                        <div className="text-xs text-muted-foreground">do {m.to}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{fmtDate(m.date)}</div>
                    </div>
                    {m.body_html ? (
                      <div
                        className="text-sm prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.body_html) }}
                      />
                    ) : (
                      <pre className="text-sm whitespace-pre-wrap font-sans">{m.body_plain}</pre>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Wybierz wiadomość z listy
          </div>
        )}
      </main>

      <ComposeEmailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        initialTo={composeInit?.to}
        initialSubject={composeInit?.subject}
      />
    </div>
  );
}
