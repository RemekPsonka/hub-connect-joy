import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateConsultation } from '@/hooks/useConsultations';
import { useToast } from '@/hooks/use-toast';

interface ConsultationNotesSectionProps {
  consultationId: string;
  notes: string | null;
}

export function ConsultationNotesSection({ consultationId, notes }: ConsultationNotesSectionProps) {
  const [value, setValue] = useState(notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const updateConsultation = useUpdateConsultation();

  useEffect(() => {
    setValue(notes || '');
  }, [notes]);

  // Debounced save
  const saveNotes = useCallback(
    async (newValue: string) => {
      if (newValue === notes) return;

      setIsSaving(true);
      try {
        await updateConsultation.mutateAsync({
          id: consultationId,
          notes: newValue || null,
        });
        setLastSaved(new Date());
      } catch (error) {
        toast({
          title: 'Błąd',
          description: 'Nie udało się zapisać notatek.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [consultationId, notes, updateConsultation, toast]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== notes) {
        saveNotes(value);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, notes, saveNotes]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Notatki ze spotkania</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Zapisywanie...</span>
              </>
            )}
            {!isSaving && lastSaved && (
              <span>Zapisano</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Wprowadź notatki ze spotkania..."
          rows={8}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
}
