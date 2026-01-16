import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateContact, type ContactWithGroup } from '@/hooks/useContacts';
import { useQueryClient } from '@tanstack/react-query';

interface ContactNotesTabProps {
  contact: ContactWithGroup;
}

export function ContactNotesTab({ contact }: ContactNotesTabProps) {
  const [notes, setNotes] = useState(contact.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const updateContact = useUpdateContact();
  const queryClient = useQueryClient();

  // Update local state when contact changes
  useEffect(() => {
    setNotes(contact.notes || '');
  }, [contact.notes]);

  // Debounced save
  const saveNotes = useCallback(
    async (newNotes: string) => {
      if (newNotes === contact.notes) return;

      setIsSaving(true);
      try {
        await updateContact.mutateAsync(
          { id: contact.id, notes: newNotes || null },
          {
            onSuccess: () => {
              // Silent update - don't show toast for auto-save
              queryClient.setQueryData(['contact', contact.id], (old: ContactWithGroup | undefined) => {
                if (old) {
                  return { ...old, notes: newNotes || null };
                }
                return old;
              });
            },
          }
        );
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [contact.id, contact.notes, updateContact, queryClient]
  );

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== contact.notes) {
        saveNotes(notes);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notes, contact.notes, saveNotes]);

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
