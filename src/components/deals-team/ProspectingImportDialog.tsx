import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useImportMeetingProspects, type ParsedPerson } from '@/hooks/useMeetingProspects';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}

export function ProspectingImportDialog({ open, onOpenChange, teamId }: Props) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [eventName, setEventName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [people, setPeople] = useState<ParsedPerson[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportMeetingProspects();

  const reset = () => {
    setStep('upload');
    setEventName('');
    setFile(null);
    setParsing(false);
    setPeople([]);
    setSelected(new Set());
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleParse = async () => {
    if (!file || !eventName.trim()) {
      toast.error('Podaj nazwę wydarzenia i wybierz plik');
      return;
    }

    setParsing(true);
    try {
      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Brak sesji');

      const response = await supabase.functions.invoke('parse-meeting-list', {
        body: {
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type || 'application/pdf',
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data;
      if (!result.people || result.people.length === 0) {
        toast.error('Nie znaleziono osób w dokumencie');
        return;
      }

      setPeople(result.people);
      // Select all by default
      setSelected(new Set(result.people.map((_: any, i: number) => i)));
      setStep('preview');
      toast.success(`Rozpoznano ${result.people.length} osób`);
    } catch (error: any) {
      toast.error(`Błąd parsowania: ${error.message}`);
    } finally {
      setParsing(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === people.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(people.map((_, i) => i)));
    }
  };

  const handleImport = () => {
    if (selected.size === 0) {
      toast.error('Zaznacz przynajmniej jedną osobę');
      return;
    }

    importMutation.mutate(
      {
        teamId,
        people,
        sourceEvent: eventName,
        sourceFileName: file?.name || '',
        selectedIndices: Array.from(selected),
      },
      {
        onSuccess: () => handleClose(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Importuj listę uczestników' : `Podgląd — ${people.length} osób`}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nazwa wydarzenia / spotkania</Label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="np. Konferencja IT 2026"
              />
            </div>

            <div className="space-y-2">
              <Label>Plik z listą uczestników</Label>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Kliknij lub przeciągnij plik (PDF, XLSX, CSV)
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={toggleAll} className="gap-2">
                <CheckSquare className="h-4 w-4" />
                {selected.size === people.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </Button>
              <span className="text-sm text-muted-foreground">
                Zaznaczono: {selected.size} / {people.length}
              </span>
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <div className="divide-y">
                {people.map((person, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleSelect(i)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{person.full_name}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {person.company && <span>{person.company}</span>}
                        {person.position && <span>• {person.position}</span>}
                        {person.industry && <span>• {person.industry}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button onClick={handleParse} disabled={parsing || !file || !eventName.trim()}>
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizuję...
                </>
              ) : (
                'Analizuj dokument'
              )}
            </Button>
          )}

          {step === 'preview' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Wróć
              </Button>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Importuj {selected.size} osób
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
