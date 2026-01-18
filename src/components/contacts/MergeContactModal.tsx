import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowRight, Check, Loader2, Sparkles, User } from 'lucide-react';
import type { Contact } from '@/hooks/useContacts';

interface MergeContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingContact: Partial<Contact>;
  newContactData: Partial<Contact>;
  onMerge: () => Promise<void>;
  onCreateNew: () => Promise<void>;
  isMerging?: boolean;
}

interface FieldComparisonProps {
  label: string;
  existingValue?: string | null;
  newValue?: string | null;
  isArray?: boolean;
  existingArray?: string[] | null;
  newArray?: string[] | null;
}

function FieldComparison({ label, existingValue, newValue, isArray, existingArray, newArray }: FieldComparisonProps) {
  if (isArray) {
    const existing = existingArray || [];
    const newer = newArray || [];
    const hasExisting = existing.length > 0;
    const hasNew = newer.length > 0;
    
    if (!hasExisting && !hasNew) return null;
    
    const merged = Array.from(new Set([...existing, ...newer]));
    const hasChanges = JSON.stringify(merged.sort()) !== JSON.stringify(existing.sort());
    
    return (
      <div className="grid grid-cols-3 gap-4 py-2 border-b border-border/50 last:border-0">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="flex flex-wrap gap-1">
          {hasExisting ? existing.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          )) : <span className="text-muted-foreground text-sm">—</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {hasNew ? newer.map((tag, i) => (
            <Badge key={i} variant={existing.includes(tag) ? "secondary" : "default"} className="text-xs">
              {tag}
              {!existing.includes(tag) && <span className="ml-1 text-xs">✓</span>}
            </Badge>
          )) : <span className="text-muted-foreground text-sm">—</span>}
        </div>
      </div>
    );
  }
  
  const hasExisting = existingValue && existingValue.trim() !== '';
  const hasNew = newValue && newValue.trim() !== '';
  
  if (!hasExisting && !hasNew) return null;
  
  const isDifferent = hasExisting && hasNew && existingValue !== newValue;
  const isNewOnly = !hasExisting && hasNew;
  const isExistingOnly = hasExisting && !hasNew;
  
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-border/50 last:border-0">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={`text-sm ${isExistingOnly ? '' : isDifferent ? 'text-muted-foreground' : ''}`}>
        {hasExisting ? existingValue : <span className="text-muted-foreground">—</span>}
      </div>
      <div className={`text-sm ${isNewOnly ? 'text-green-600 dark:text-green-400 font-medium' : isDifferent ? 'text-amber-600 dark:text-amber-400' : ''}`}>
        {hasNew ? (
          <span className="flex items-center gap-1">
            {newValue}
            {isNewOnly && <Check className="h-3 w-3" />}
            {isDifferent && <AlertTriangle className="h-3 w-3" />}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

export function MergeContactModal({
  isOpen,
  onClose,
  existingContact,
  newContactData,
  onMerge,
  onCreateNew,
  isMerging = false,
}: MergeContactModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMerge = async () => {
    setIsProcessing(true);
    try {
      await onMerge();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNew = async () => {
    setIsProcessing(true);
    try {
      await onCreateNew();
    } finally {
      setIsProcessing(false);
    }
  };

  const hasNotes = (existingContact.notes || newContactData.notes);
  const bothHaveNotes = existingContact.notes && newContactData.notes && existingContact.notes !== newContactData.notes;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Wykryto potencjalny duplikat
          </DialogTitle>
          <DialogDescription>
            Znaleziono kontakt o podobnych danych. Wybierz czy chcesz scalić dane, czy utworzyć nowy kontakt.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 pb-2 border-b">
              <div className="text-sm font-semibold text-muted-foreground">Pole</div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-semibold">Istniejący kontakt</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Nowe dane</span>
              </div>
            </div>

            {/* Comparisons */}
            <FieldComparison 
              label="Imię i nazwisko" 
              existingValue={existingContact.full_name} 
              newValue={newContactData.full_name || `${newContactData.first_name || ''} ${newContactData.last_name || ''}`.trim()} 
            />
            <FieldComparison label="Email" existingValue={existingContact.email} newValue={newContactData.email} />
            <FieldComparison label="Telefon" existingValue={existingContact.phone} newValue={newContactData.phone} />
            <FieldComparison label="Firma" existingValue={existingContact.company} newValue={newContactData.company} />
            <FieldComparison label="Stanowisko" existingValue={existingContact.position} newValue={newContactData.position} />
            <FieldComparison label="Miasto" existingValue={existingContact.city} newValue={newContactData.city} />
            <FieldComparison label="LinkedIn" existingValue={existingContact.linkedin_url} newValue={newContactData.linkedin_url} />
            <FieldComparison label="Źródło" existingValue={existingContact.source} newValue={newContactData.source} />
            <FieldComparison 
              label="Tagi" 
              isArray 
              existingArray={existingContact.tags} 
              newArray={newContactData.tags} 
            />

            {/* Notes section */}
            {hasNotes && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Notatki {bothHaveNotes && <Badge variant="outline" className="text-xs">AI zintegruje</Badge>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">Istniejące</div>
                      <div className="text-sm bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
                        {existingContact.notes || <span className="text-muted-foreground italic">Brak</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-primary">Nowe</div>
                      <div className="text-sm bg-primary/5 border border-primary/20 rounded-md p-3 max-h-32 overflow-y-auto">
                        {newContactData.notes || <span className="text-muted-foreground italic">Brak</span>}
                      </div>
                    </div>
                  </div>
                  
                  {bothHaveNotes && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Po scaleniu AI połączy oba opisy w jeden spójny tekst
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Preview */}
            <Separator className="my-4" />
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Podgląd wyniku scalenia
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Puste pola zostaną uzupełnione nowymi danymi</li>
                <li>• Tagi zostaną połączone (unikalne)</li>
                {bothHaveNotes && <li>• Notatki zostaną zintegrowane przez AI</li>}
                <li>• Istniejące wartości nie zostaną nadpisane</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isProcessing}
          >
            Anuluj
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleCreateNew}
            disabled={isProcessing}
          >
            {isProcessing && !isMerging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Utwórz jako nowy kontakt
          </Button>
          <Button 
            onClick={handleMerge}
            disabled={isProcessing}
          >
            {isMerging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Scal kontakty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
