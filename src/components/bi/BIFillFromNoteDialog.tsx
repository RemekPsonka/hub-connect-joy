import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, NotebookPen, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BIFillFromNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (data: Record<string, any>) => void;
  contactName: string;
  companyName?: string;
  isProcessing: boolean;
  onProcess: (note: string) => Promise<Record<string, any> | null>;
}

const SECTION_LABELS: Record<string, string> = {
  section_a_basic: 'A. Dane podstawowe',
  section_c_company_profile: 'C. Firma – profil',
  section_d_scale: 'D. Skala działalności',
  section_f_strategy: 'F. Strategia',
  section_g_needs: 'G. Potrzeby',
  section_h_investments: 'H. Inwestycje',
  section_j_value_for_cc: 'J. Wartość dla CC',
  section_k_engagement: 'K. Zaangażowanie',
  section_l_personal: 'L. Sfera osobista',
  section_m_organizations: 'M. Organizacje',
  section_n_followup: 'N. Follow-up',
};

export function BIFillFromNoteDialog({
  open,
  onOpenChange,
  onApply,
  contactName,
  companyName,
  isProcessing,
  onProcess,
}: BIFillFromNoteDialogProps) {
  const [note, setNote] = useState('');
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [aiNotes, setAiNotes] = useState('');

  const filledSections = result
    ? Object.keys(result).filter(k => k !== 'ai_notes' && k.startsWith('section_') && Object.keys(result[k] || {}).length > 0)
    : [];

  const handleProcess = async () => {
    if (!note.trim()) return;
    const data = await onProcess(note);
    if (data) {
      setResult(data);
      setAiNotes(data.ai_notes || '');
    }
  };

  const handleApply = () => {
    if (result) {
      const { ai_notes, ...sections } = result;
      onApply(sections);
      handleClose();
    }
  };

  const handleClose = () => {
    setNote('');
    setResult(null);
    setAiNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />
            Uzupełnij z notatki — {contactName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-muted-foreground">
                Wklej notatkę ze spotkania. AI wyciągnie dane i uzupełni arkusz BI.
                {companyName && <> Firma: <strong>{companyName}</strong></>}
              </p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Wklej tutaj notatkę ze spotkania..."
                className="min-h-[250px] font-mono text-sm"
                disabled={isProcessing}
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Analiza zakończona</span>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Uzupełnione sekcje:</p>
                <div className="flex flex-wrap gap-1.5">
                  {filledSections.map(section => (
                    <Badge key={section} variant="secondary" className="text-xs">
                      {SECTION_LABELS[section] || section}
                    </Badge>
                  ))}
                  {filledSections.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nie znaleziono danych do uzupełnienia</p>
                  )}
                </div>
              </div>

              {aiNotes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notatki AI:</p>
                  <p className="text-sm">{aiNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <Button
              onClick={handleProcess}
              disabled={!note.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizuję...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analizuj i uzupełnij
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setResult(null); }}>
                Wróć do edycji
              </Button>
              <Button onClick={handleApply} disabled={filledSections.length === 0}>
                Zastosuj ({filledSections.length} sekcji)
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
