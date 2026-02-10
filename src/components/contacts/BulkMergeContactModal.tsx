import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitMerge, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBulkMergeContacts } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';

interface BulkMergeContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: [string, string];
  onSuccess: () => void;
}

type ContactData = Record<string, any>;

const SIMPLE_FIELDS: { key: string; label: string }[] = [
  { key: 'full_name', label: 'Imię i nazwisko' },
  { key: 'first_name', label: 'Imię' },
  { key: 'last_name', label: 'Nazwisko' },
  { key: 'email', label: 'Email' },
  { key: 'email_secondary', label: 'Email dodatkowy' },
  { key: 'phone', label: 'Telefon prywatny' },
  { key: 'phone_business', label: 'Telefon służbowy' },
  { key: 'company', label: 'Firma' },
  { key: 'position', label: 'Stanowisko' },
  { key: 'city', label: 'Miasto' },
  { key: 'linkedin_url', label: 'LinkedIn' },
  { key: 'source', label: 'Źródło' },
  { key: 'address', label: 'Adres' },
  { key: 'address_secondary', label: 'Adres dodatkowy' },
  { key: 'profile_summary', label: 'Profil AI' },
  { key: 'primary_group_id', label: 'Grupa' },
  { key: 'company_id', label: 'Firma (powiązanie)' },
  { key: 'relationship_strength', label: 'Siła relacji' },
];

type NotesMode = 'a' | 'b' | 'merge';

export function BulkMergeContactModal({ open, onOpenChange, contactIds, onSuccess }: BulkMergeContactModalProps) {
  const [contactA, setContactA] = useState<ContactData | null>(null);
  const [contactB, setContactB] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, 'a' | 'b'>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notesMode, setNotesMode] = useState<NotesMode>('a');
  const mergeMutation = useBulkMergeContacts();

  // Load full contact data
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.from('contacts').select('*, contact_groups(name, color)').eq('id', contactIds[0]).single(),
      supabase.from('contacts').select('*, contact_groups(name, color)').eq('id', contactIds[1]).single(),
    ]).then(([resA, resB]) => {
      if (resA.data && resB.data) {
        const a = resA.data as ContactData;
        const b = resB.data as ContactData;
        setContactA(a);
        setContactB(b);

        // Default selections: pick the one with more data
        const countFilled = (c: any) => SIMPLE_FIELDS.reduce((acc, f) => acc + (c[f.key] ? 1 : 0), 0);
        const aScore = countFilled(a);
        const bScore = countFilled(b);
        const defaultChoice = aScore >= bScore ? 'a' : 'b';

        const initial: Record<string, 'a' | 'b'> = {};
        for (const field of SIMPLE_FIELDS) {
          const valA = a[field.key];
          const valB = b[field.key];
          if (field.key === 'relationship_strength') {
            initial[field.key] = (valA || 0) >= (valB || 0) ? 'a' : 'b';
          } else if (valA && !valB) {
            initial[field.key] = 'a';
          } else if (!valA && valB) {
            initial[field.key] = 'b';
          } else {
            initial[field.key] = defaultChoice as 'a' | 'b';
          }
        }
        setSelections(initial);

        // Tags: all selected by default
        const allTags = Array.from(new Set([...(a.tags || []), ...(b.tags || [])]));
        setSelectedTags(allTags);

        // Notes
        setNotesMode(defaultChoice as 'a' | 'b');
      }
      setLoading(false);
    });
  }, [open, contactIds]);

  const getDisplayValue = (contact: ContactData, fieldKey: string): string => {
    if (fieldKey === 'primary_group_id') {
      return contact.contact_groups?.name || '-';
    }
    if (fieldKey === 'relationship_strength') {
      return contact[fieldKey] != null ? `${contact[fieldKey]}/10` : '-';
    }
    const val = contact[fieldKey];
    if (val == null || val === '') return '-';
    return String(val);
  };

  const allTagsA = useMemo(() => contactA?.tags || [], [contactA]);
  const allTagsB = useMemo(() => contactB?.tags || [], [contactB]);
  const allTags = useMemo(() => Array.from(new Set([...allTagsA, ...allTagsB])), [allTagsA, allTagsB]);

  const mergedResult = useMemo(() => {
    if (!contactA || !contactB) return {};
    const result: Record<string, any> = {};
    for (const field of SIMPLE_FIELDS) {
      const source = selections[field.key] === 'a' ? contactA : contactB;
      result[field.key] = source[field.key];
    }
    result.tags = selectedTags;
    if (notesMode === 'merge') {
      const notesA = contactA.notes || '';
      const notesB = contactB.notes || '';
      result.notes = notesA && notesB ? `${notesA}\n\n---\n\n${notesB}` : notesA || notesB;
    } else {
      result.notes = (notesMode === 'a' ? contactA : contactB).notes;
    }
    return result;
  }, [contactA, contactB, selections, selectedTags, notesMode]);

  const handleMerge = async () => {
    if (!contactA || !contactB) return;
    const primaryId = contactA.id;
    const secondaryId = contactB.id;

    await mergeMutation.mutateAsync({
      primaryContactId: primaryId,
      secondaryContactId: secondaryId,
      mergedFields: mergedResult,
    });
    onSuccess();
    onOpenChange(false);
  };

  const isIdentical = (fieldKey: string) => {
    if (!contactA || !contactB) return false;
    const a = contactA[fieldKey];
    const b = contactB[fieldKey];
    if (!a && !b) return true;
    return a === b;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Scalanie kontaktów
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Wybierz wartości, które chcesz zachować w scalonym kontakcie.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contactA && contactB ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Header row */}
            <div className="grid grid-cols-[180px_1fr_1fr] gap-2 mb-2 sticky top-0 bg-background z-10 pb-2 border-b">
              <div className="text-sm font-medium text-muted-foreground">Pole</div>
              <div className="text-sm font-medium truncate">
                {contactA.full_name}
                <span className="text-xs text-muted-foreground ml-1">(A)</span>
              </div>
              <div className="text-sm font-medium truncate">
                {contactB.full_name}
                <span className="text-xs text-muted-foreground ml-1">(B)</span>
              </div>
            </div>

            {/* Simple fields */}
            {SIMPLE_FIELDS.map((field) => {
              const valA = getDisplayValue(contactA, field.key);
              const valB = getDisplayValue(contactB, field.key);
              const identical = isIdentical(field.key);
              const bothEmpty = valA === '-' && valB === '-';

              if (bothEmpty) return null;

              return (
                <div key={field.key} className="grid grid-cols-[180px_1fr_1fr] gap-2 py-1.5 border-b border-border/50">
                  <div className="text-sm text-muted-foreground self-center">{field.label}</div>
                  <button
                    type="button"
                    disabled={identical}
                    onClick={() => setSelections(prev => ({ ...prev, [field.key]: 'a' }))}
                    className={cn(
                      'text-sm text-left px-2 py-1 rounded transition-colors truncate',
                      selections[field.key] === 'a'
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        : 'hover:bg-muted',
                      identical && 'opacity-60 cursor-default'
                    )}
                  >
                    {identical && <Check className="h-3 w-3 inline mr-1 text-primary" />}
                    {valA}
                  </button>
                  <button
                    type="button"
                    disabled={identical}
                    onClick={() => setSelections(prev => ({ ...prev, [field.key]: 'b' }))}
                    className={cn(
                      'text-sm text-left px-2 py-1 rounded transition-colors truncate',
                      selections[field.key] === 'b'
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        : 'hover:bg-muted',
                      identical && 'opacity-60 cursor-default'
                    )}
                  >
                    {identical && <Check className="h-3 w-3 inline mr-1 text-primary" />}
                    {valB}
                  </button>
                </div>
              );
            })}

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="py-3 border-b border-border/50">
                <div className="text-sm text-muted-foreground mb-2">Tagi (zaznacz do zachowania)</div>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <label key={tag} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={(checked) => {
                          setSelectedTags(prev =>
                            checked ? [...prev, tag] : prev.filter(t => t !== tag)
                          );
                        }}
                      />
                      <Badge variant="secondary" className="text-xs">
                        {tag}
                        {allTagsA.includes(tag) && !allTagsB.includes(tag) && <span className="ml-1 opacity-50">(A)</span>}
                        {allTagsB.includes(tag) && !allTagsA.includes(tag) && <span className="ml-1 opacity-50">(B)</span>}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {(contactA.notes || contactB.notes) && (
              <div className="py-3 border-b border-border/50">
                <div className="text-sm text-muted-foreground mb-2">Notatki</div>
                <div className="flex gap-2">
                  <Button
                    variant={notesMode === 'a' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotesMode('a')}
                    disabled={!contactA.notes}
                  >
                    Zachowaj A
                  </Button>
                  <Button
                    variant={notesMode === 'b' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNotesMode('b')}
                    disabled={!contactB.notes}
                  >
                    Zachowaj B
                  </Button>
                  {contactA.notes && contactB.notes && (
                    <Button
                      variant={notesMode === 'merge' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNotesMode('merge')}
                    >
                      Połącz obie
                    </Button>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
          <Button
            onClick={handleMerge}
            disabled={mergeMutation.isPending || loading}
            className="gap-2"
          >
            {mergeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="h-4 w-4" />
            )}
            Scal kontakty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
