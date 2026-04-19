import { useState } from 'react';
import Papa from 'papaparse';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CSVMappingStep } from './CSVMappingStep';
import { useCSVImportPresets } from '@/hooks/useCSVImportPresets';

type Step = 'upload' | 'mapping' | 'preview' | 'progress' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ImportResult {
  inserted: number;
  skipped_duplicates: number;
  errors: { row: number; message: string }[];
}

export function ImportLeadsDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data: presets = [] } = useCSVImportPresets();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRow, setSampleRow] = useState<Record<string, string> | undefined>();
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [presetName, setPresetName] = useState('');
  const [sourceLabel, setSourceLabel] = useState('CSV import');
  const [previewSummary, setPreviewSummary] = useState<{ would_insert: number; would_skip: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setSampleRow(undefined);
    setAllRows([]);
    setMapping({});
    setPresetName('');
    setSourceLabel('CSV import');
    setPreviewSummary(null);
    setProgress(0);
    setResult(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onFileChange = (f: File | null) => {
    if (!f) return;
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields ?? []);
        setSampleRow(res.data[0]);
        setStep('mapping');
      },
    });
  };

  const loadPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setMapping(p.column_mapping);
    setPresetName(p.name);
  };

  const goToPreview = () => {
    if (!file) return;
    if (!mapping.full_name) {
      toast.error('Mapowanie „Imię i nazwisko" jest wymagane');
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data;
        setAllRows(rows);
        const leads = rows.map((r) => ({
          full_name: r[mapping.full_name],
          phone: mapping.phone ? r[mapping.phone] : null,
          email: mapping.email ? r[mapping.email] : null,
          company_name: mapping.company_name ? r[mapping.company_name] : null,
          nip: mapping.nip ? r[mapping.nip] : null,
          notes: mapping.notes ? r[mapping.notes] : null,
        }));
        // dry-run for preview
        const { data, error } = await supabase.functions.invoke('sgu-import-leads', {
          body: { leads: leads.slice(0, 500), source: sourceLabel, dry_run: true },
        });
        if (error) {
          toast.error('Błąd preview: ' + error.message);
          return;
        }
        setPreviewSummary({
          would_insert: (data as { would_insert: number }).would_insert ?? 0,
          would_skip: (data as { would_skip: number }).would_skip ?? 0,
        });
        setStep('preview');
      },
    });
  };

  const runImport = async () => {
    if (!allRows.length) return;
    setBusy(true);
    setStep('progress');
    setProgress(0);
    const leads = allRows.map((r) => ({
      full_name: r[mapping.full_name],
      phone: mapping.phone ? r[mapping.phone] : null,
      email: mapping.email ? r[mapping.email] : null,
      company_name: mapping.company_name ? r[mapping.company_name] : null,
      nip: mapping.nip ? r[mapping.nip] : null,
      notes: mapping.notes ? r[mapping.notes] : null,
    }));

    const totalAggregate: ImportResult = { inserted: 0, skipped_duplicates: 0, errors: [] };
    const BATCH = 50;
    for (let i = 0; i < leads.length; i += BATCH) {
      const slice = leads.slice(i, i + BATCH);
      const isLastBatchWithPreset = i + BATCH >= leads.length && presetName.trim().length > 0;
      const { data, error } = await supabase.functions.invoke('sgu-import-leads', {
        body: {
          leads: slice,
          source: sourceLabel,
          preset_name: isLastBatchWithPreset ? presetName.trim() : undefined,
          column_mapping: isLastBatchWithPreset ? mapping : undefined,
        },
      });
      if (error) {
        toast.error('Błąd batcha: ' + error.message);
        break;
      }
      const r = data as ImportResult;
      totalAggregate.inserted += r.inserted ?? 0;
      totalAggregate.skipped_duplicates += r.skipped_duplicates ?? 0;
      totalAggregate.errors.push(...(r.errors ?? []));
      setProgress(Math.round(((i + slice.length) / leads.length) * 100));
    }

    setResult(totalAggregate);
    setStep('done');
    setBusy(false);
    qc.invalidateQueries({ queryKey: ['sgu-prospects'] });
    qc.invalidateQueries({ queryKey: ['sgu-csv-presets'] });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importuj leady z CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Krok 1/4 — wgraj plik CSV'}
            {step === 'mapping' && 'Krok 2/4 — zmapuj kolumny'}
            {step === 'preview' && 'Krok 3/4 — podgląd'}
            {step === 'progress' && 'Krok 4/4 — importowanie...'}
            {step === 'done' && 'Zakończono'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/40 transition">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Kliknij lub przeciągnij plik .csv
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            {presets.length > 0 && (
              <div className="space-y-1.5">
                <Label>Załaduj zapisany preset</Label>
                <Select onValueChange={loadPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz preset…" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <CSVMappingStep
              headers={headers}
              sampleRow={sampleRow}
              mapping={mapping}
              onMappingChange={setMapping}
            />
            <div className="space-y-1.5">
              <Label htmlFor="preset-name">Nazwa presetu (opcjonalna)</Label>
              <Input
                id="preset-name"
                placeholder="np. Targi 2026 Poznań"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Wstecz
              </Button>
              <Button onClick={goToPreview} disabled={!mapping.full_name}>
                Dalej
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && previewSummary && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-sm">
                Zostanie zaimportowanych{' '}
                <span className="font-semibold text-foreground">{previewSummary.would_insert}</span>{' '}
                leadów.
              </p>
              <p className="text-sm text-muted-foreground">
                {previewSummary.would_skip} duplikatów pominiętych (telefon lub email już istnieje w SGU).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-label">Źródło importu</Label>
              <Input
                id="source-label"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="np. Targi 2026 Poznań"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Wstecz
              </Button>
              <Button onClick={runImport}>Importuj</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'progress' && (
          <div className="space-y-4 py-4">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">{progress}%</p>
            {busy && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-1">
              <p className="text-sm">
                <span className="font-semibold">{result.inserted}</span> dodanych
              </p>
              <p className="text-sm text-muted-foreground">
                {result.skipped_duplicates} duplikatów pominiętych
              </p>
              {result.errors.length > 0 && (
                <p className="text-sm text-destructive">{result.errors.length} błędów</p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Zamknij</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
