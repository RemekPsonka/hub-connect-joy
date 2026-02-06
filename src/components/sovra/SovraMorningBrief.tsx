import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataCard } from '@/components/ui/data-card';
import { SovraAvatar } from './SovraAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SovraMorningBriefProps {
  onSwitchToChat: (sessionId: string) => void;
}

interface BriefData {
  session_id: string | null;
  brief: string;
  data: {
    tasks_today: Array<{ id: string; title: string; priority?: string }>;
    tasks_overdue: Array<{ id: string; title: string; due_date?: string }>;
    events: Array<{ summary: string; start_time: string }>;
    projects: Array<{ id: string; name: string; status?: string }>;
  };
}

export function SovraMorningBrief({ onSwitchToChat }: SovraMorningBriefProps) {
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBrief() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('sovra-morning-session');

        if (cancelled) return;

        if (fnError) throw fnError;
        if (data?.error === 'rate_limit') {
          setError(data.message || 'Limit briefów osiągnięty. Spróbuj za chwilę.');
          return;
        }

        setBriefData(data as BriefData);
      } catch (e) {
        if (cancelled) return;
        console.error('Morning brief error:', e);
        setError('Nie udało się wygenerować briefu. Spróbuj ponownie.');
        toast.error('Błąd generowania briefu');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBrief();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <SovraAvatar size="lg" className="animate-pulse" />
        <p className="text-sm text-muted-foreground">Sovra przygotowuje Twój poranny brief...</p>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        <SovraAvatar size="lg" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!briefData) return null;

  const { brief, data, session_id } = briefData;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Brief content */}
        <DataCard title="Poranny Brief" action={<SovraAvatar size="sm" />}>
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
            <ReactMarkdown>{brief}</ReactMarkdown>
          </div>
        </DataCard>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{data.tasks_today.length}</p>
            <p className="text-xs text-muted-foreground">Zadania dziś</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{data.tasks_overdue.length}</p>
            <p className="text-xs text-muted-foreground">Zaległe</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{data.events.length}</p>
            <p className="text-xs text-muted-foreground">Spotkania</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{data.projects.length}</p>
            <p className="text-xs text-muted-foreground">Projekty</p>
          </div>
        </div>

        {/* Continue in chat */}
        {session_id && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => onSwitchToChat(session_id)}
              className="gap-2"
            >
              💬 Kontynuuj w chacie
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
