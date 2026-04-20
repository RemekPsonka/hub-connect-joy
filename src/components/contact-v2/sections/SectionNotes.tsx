// TODO: edycja notatki — modal z formularzem (osobny sprint).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SectionShell } from './SectionShell';

interface Props {
  contactId: string;
  enabled: boolean;
}

export function SectionNotes({ contactId, enabled }: Props) {
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['contact-v2-section', 'notes', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_notes')
        .select('id, content, created_at, created_by')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contact_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notatka usunięta');
      qc.invalidateQueries({ queryKey: ['contact-v2-section', 'notes', contactId] });
      qc.invalidateQueries({ queryKey: ['contact-timeline', contactId] });
      setToDelete(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Nie udało się usunąć');
    },
  });

  return (
    <>
      <SectionShell
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        refetch={query.refetch}
        isEmpty={!query.data || query.data.length === 0}
        emptyMessage="Brak notatek — dodaj pierwszą przez composer powyżej"
      >
        <div className="divide-y">
          {query.data?.map((n) => (
            <div key={n.id} className="py-2 text-sm flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(n.created_at).toLocaleString('pl-PL')}
                </div>
                <div className="whitespace-pre-wrap">{n.content}</div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setToDelete(n.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </SectionShell>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć notatkę?</AlertDialogTitle>
            <AlertDialogDescription>Tej operacji nie można cofnąć.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
