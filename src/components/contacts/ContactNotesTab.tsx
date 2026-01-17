import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateContact, type ContactWithDetails } from '@/hooks/useContacts';

interface ContactNotesTabProps {
  contact: ContactWithDetails;
}

// Normalizacja null/undefined → "" dla poprawnego porównania
const normalizeNotes = (value: string | null | undefined): string => value || '';

export function ContactNotesTab({ contact }: ContactNotesTabProps) {
  const [notes, setNotes] = useState(normalizeNotes(contact.notes));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isFirstRender = useRef(true);
  const updateContact = useUpdateContact();

  // Reset state przy zmianie kontaktu
  useEffect(() => {
    setNotes(normalizeNotes(contact.notes));
    setLastSaved(null);
    isFirstRender.current = true;
  }, [contact.id]);

  // Funkcja zapisu
  const saveNotes = useCallback(
    async (newNotes: string) => {
      if (normalizeNotes(newNotes) === normalizeNotes(contact.notes)) return;

      setIsSaving(true);
      try {
        await updateContact.mutateAsync({
          id: contact.id,
          notes: newNotes || null,
          silent: true, // Cichy zapis bez toasta i pełnej invalidacji
        });
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [contact.id, contact.notes, updateContact]
  );

  // Debounce - nie uruchamiaj przy pierwszej renderacji
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveNotes(notes);
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, saveNotes]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notatki</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Zapisywanie...</span>
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-4 w-4" />
              <span>Zapisano</span>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Dodaj notatki o tym kontakcie..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[300px] resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Notatki są automatycznie zapisywane podczas pisania
        </p>
      </CardContent>
    </Card>
  );
}
