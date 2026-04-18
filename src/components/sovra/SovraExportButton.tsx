import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Props {
  conversationId?: string | null;
  disabled?: boolean;
}

export function SovraExportButton({ conversationId, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleExport = async () => {
    if (!conversationId) {
      toast.error('Brak aktywnej konwersacji do eksportu');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('workspace-create-note-from-sovra', {
        body: { conversation_id: conversationId },
      });
      if (error) throw error;
      const noteId = (data as any)?.note_id;
      toast.success('Notatka utworzona', {
        action: noteId
          ? {
              label: 'Otwórz',
              onClick: () => navigate(`/workspace?tab=cockpit&note=${noteId}`),
            }
          : undefined,
      });
    } catch (e: any) {
      toast.error('Eksport nie powiódł się: ' + (e?.message ?? 'nieznany błąd'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || loading || !conversationId}
      onClick={handleExport}
      className="gap-1.5 text-xs text-muted-foreground"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      Eksportuj do notatki
    </Button>
  );
}
