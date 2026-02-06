import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader2, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateCompany } from '@/hooks/useCompanies';

interface CompanyNotesPanelProps {
  company: {
    id: string;
    notes?: string | null;
  };
}

const MAX_CHARS = 2000;

function normalize(val: unknown): string {
  if (typeof val === 'string') return val;
  return '';
}

export function CompanyNotesPanel({ company }: CompanyNotesPanelProps) {
  const [notes, setNotes] = useState(normalize(company.notes));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isFirstRender = useRef(true);
  const updateCompany = useUpdateCompany();

  useEffect(() => {
    setNotes(normalize(company.notes));
    setLastSaved(null);
    isFirstRender.current = true;
  }, [company.id]);

  const saveNotes = useCallback(
    async (newNotes: string) => {
      if (normalize(newNotes) === normalize(company.notes)) return;
      setIsSaving(true);
      try {
        await updateCompany.mutateAsync({
          id: company.id,
          data: { notes: newNotes || null },
        });
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    },
    [company.id, company.notes, updateCompany]
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
          Notatki firmy
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
          placeholder="Dodaj notatki o tej firmie..."
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          className="min-h-[100px] resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {notes.length}/{MAX_CHARS}
        </p>
      </CardContent>
    </Card>
  );
}
