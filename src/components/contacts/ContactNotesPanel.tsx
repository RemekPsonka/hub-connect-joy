import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader2, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateContact, type ContactWithDetails } from '@/hooks/useContacts';
import { normalizeNotes } from '@/lib/utils';

interface ContactNotesPanelProps {
  contact: ContactWithDetails;
}

const MAX_CHARS = 2000;

export function ContactNotesPanel({ contact }: ContactNotesPanelProps) {
  const [notes, setNotes] = useState(normalizeNotes(contact.notes));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isFirstRender = useRef(true);
  const updateContact = useUpdateContact();

  useEffect(() => {
    setNotes(normalizeNotes(contact.notes));
    setLastSaved(null);
    isFirstRender.current = true;
  }, [contact.id]);

  const saveNotes = useCallback(
    async (newNotes: string) => {
      if (normalizeNotes(newNotes) === normalizeNotes(contact.notes)) return;
      setIsSaving(true);
      try {
        await updateContact.mutateAsync({
          id: contact.id,
          notes: newNotes || null,
          silent: true,
        });
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [contact.id, contact.notes, updateContact]
  );

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

  const handleChange = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setNotes(value);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notatki
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Zapisywanie...</span>
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-3 w-3" />
              <span>Zapisano</span>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <Textarea
          placeholder="Dodaj notatki o tym kontakcie..."
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[120px] resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {notes.length}/{MAX_CHARS}
        </p>
      </CardContent>
    </Card>
  );
}
