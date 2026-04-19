import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGmailThreadsByContact } from '@/hooks/useGmailThreads';

export function ContactEmailsTab({ contactId }: { contactId: string }) {
  const { data, isLoading } = useGmailThreadsByContact(contactId);

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Brak powiązanych wiadomości. Zsynchronizuj Gmail w zakładce „Skrzynka".
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((t) => (
        <Link
          key={t.id}
          to={`/inbox?thread=${t.id}`}
          className="block p-3 rounded-md border hover:bg-muted/50 transition-colors"
        >
          <div className="flex justify-between gap-2">
            <span className={`text-sm truncate ${t.is_unread ? 'font-semibold' : ''}`}>{t.subject || '(bez tematu)'}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {t.last_message_at ? format(new Date(t.last_message_at), 'dd.MM.yyyy HH:mm', { locale: pl }) : ''}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">{t.snippet}</div>
          {t.is_unread && <Badge className="mt-1 text-xs">nowe</Badge>}
        </Link>
      ))}
    </div>
  );
}
