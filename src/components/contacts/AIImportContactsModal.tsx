import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileSpreadsheet, 
  Upload, 
  FileText, 
  Image, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  ArrowRight,
  Users,
  Merge,
  Plus,
  X,
  MapPin,
  Calendar
} from 'lucide-react';
import { useAIImport, ParsedContact, DuplicateMatch } from '@/hooks/useAIImport';
import { useContactGroups } from '@/hooks/useContacts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'source' | 'preview' | 'settings' | 'duplicates' | 'importing' | 'complete';

// Suggested "met at" sources
const metSourceSuggestions = [
  'Poznany na CC',
  'Poznany na EKG',
  'NARVIL2025',
  'Konferencja',
  'LinkedIn',
  'Rekomendacja',
  'Networking'
];

export function AIImportContactsModal({ open, onOpenChange, onSuccess }: AIImportContactsModalProps) {
  const [step, setStep] = useState<Step>('source');
  const [pastedText, setPastedText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [metSource, setMetSource] = useState('');
  const [metDate, setMetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [listAccepted, setListAccepted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groups } = useContactGroups();
  const {
    isParsing,
    isCheckingDuplicates,
    isImporting,
    parsedContacts,
    duplicates,
    newContacts,
    metadata,
    errors,
    progress,
    parseFiles,
    parseText,
    checkAllDuplicates,
    updateDuplicateDecision,
    importContacts,
    reset
  } = useAIImport();

  // Find "Inne" group as default
  const defaultGroup = groups?.find(g => g.name.toLowerCase() === 'inne');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('source');
      setPastedText('');
      setSelectedGroupId('');
      setMetSource('');
      setMetDate(new Date().toISOString().split('T')[0]);
      setUploadedFiles([]);
      setListAccepted(false);
      reset();
    }
  }, [open, reset]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = async () => {
    if (uploadedFiles.length > 0) {
      await parseFiles(uploadedFiles);
    } else if (pastedText.trim()) {
      await parseText(pastedText);
    }
    
    // Move to preview step if we have contacts
    if (parsedContacts.length > 0 || !errors.length) {
      setStep('preview');
    }
  };

  // After parsing - check if we got contacts and transition
  useEffect(() => {
    if (step === 'source' && parsedContacts.length > 0 && !isParsing) {
      setStep('preview');
    }
  }, [parsedContacts, isParsing, step]);

  const handleAcceptList = () => {
    setListAccepted(true);
    setStep('settings');
  };

  const handleCheckDuplicates = async () => {
    await checkAllDuplicates();
    if (duplicates.length > 0) {
      setStep('duplicates');
    } else {
      handleImport();
    }
  };

  const handleImport = async () => {
    setStep('importing');
    // Use selected group or default to "Inne"
    const groupToUse = selectedGroupId || defaultGroup?.id;
    const result = await importContacts(groupToUse, metSource || undefined, metDate || undefined);
    setStep('complete');
    
    if (result.errors.length === 0) {
      toast.success('Import zakończony', {
        description: `Utworzono: ${result.created}, Scalono: ${result.merged}, Pominięto: ${result.skipped}`
      });
    } else {
      toast.warning('Import zakończony z błędami', {
        description: `Utworzono: ${result.created}, Scalono: ${result.merged}, Błędy: ${result.errors.length}`
      });
    }
    
    onSuccess?.();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return <Image className="h-4 w-4" />;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileSpreadsheet className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getStepNumber = () => {
    switch (step) {
      case 'source': return 1;
      case 'preview': return 2;
      case 'settings': return 3;
      case 'duplicates': return 4;
      case 'importing': return 5;
      case 'complete': return 5;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import kontaktów przez AI
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Krok {getStepNumber()} z 5
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === 'source' && 'Wgraj pliki lub wklej dane do automatycznego rozpoznania kontaktów'}
            {step === 'preview' && 'Sprawdź rozpoznane kontakty i zaakceptuj listę'}
            {step === 'settings' && 'Skonfiguruj ustawienia importu'}
            {step === 'duplicates' && 'Zdecyduj co zrobić z wykrytymi duplikatami'}
            {step === 'importing' && 'Trwa importowanie kontaktów...'}
            {step === 'complete' && 'Import zakończony'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step: Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Wgraj pliki</TabsTrigger>
                  <TabsTrigger value="paste">Wklej tekst</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                      dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Przeciągnij pliki tutaj lub kliknij aby wybrać
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Obsługiwane formaty: PNG, JPG (zrzuty ekranu), PDF, Excel, CSV
                    </p>
                    <p className="text-xs text-primary mt-2">
                      Możesz dodać wiele plików naraz
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Wybrane pliki ({uploadedFiles.length}):</p>
                      <div className="space-y-1">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.name)}
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeFile(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="paste" className="space-y-4">
                  <Textarea
                    placeholder="Wklej tutaj dane kontaktów (np. skopiowaną tabelę z HubSpot, listę z Excela, itp.)"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>

              {errors.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-center gap-2 text-destructive mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Błędy</span>
                  </div>
                  {errors.map((err, idx) => (
                    <p key={idx} className="text-sm text-destructive">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {metadata && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Format: {metadata.sourceFormat}
                  </Badge>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {metadata.totalParsed} kontaktów
                  </Badge>
                  {metadata.detectedColumns.length > 0 && (
                    <Badge variant="outline">
                      Kolumny: {metadata.detectedColumns.join(', ')}
                    </Badge>
                  )}
                </div>
              )}

              {metadata?.warnings && metadata.warnings.length > 0 && (
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 mb-1">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Ostrzeżenia</span>
                  </div>
                  {metadata.warnings.map((w, idx) => (
                    <p key={idx} className="text-xs text-yellow-600 dark:text-yellow-500">{w}</p>
                  ))}
                </div>
              )}

              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Imię</th>
                        <th className="text-left py-2 px-2">Nazwisko</th>
                        <th className="text-left py-2 px-2">Firma</th>
                        <th className="text-left py-2 px-2">Email</th>
                        <th className="text-left py-2 px-2">Telefon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedContacts.map((contact, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-2">{contact.first_name || '-'}</td>
                          <td className="py-2 px-2">{contact.last_name || '-'}</td>
                          <td className="py-2 px-2">{contact.company || '-'}</td>
                          <td className="py-2 px-2 text-muted-foreground">{contact.email || '-'}</td>
                          <td className="py-2 px-2 text-muted-foreground">{contact.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Sprawdź czy rozpoznane dane są poprawne. Po zaakceptowaniu przejdziesz do konfiguracji importu.
                </p>
              </div>
            </div>
          )}

          {/* Step: Settings */}
          {step === 'settings' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Grupa docelowa</Label>
                <Select 
                  value={selectedGroupId || 'none'} 
                  onValueChange={(val) => setSelectedGroupId(val === 'none' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz grupę..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Bez wyboru (→ Inne)</span>
                    </SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group.color || '#6366f1' }}
                          />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Jeśli nie wybierzesz grupy, kontakty trafią do grupy "Inne"
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Skąd poznany? (opcjonalne)
                </Label>
                <Input
                  placeholder="np. CC WAW 2025, NARVIL, EKG..."
                  value={metSource}
                  onChange={(e) => setMetSource(e.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                  {metSourceSuggestions.map((suggestion) => (
                    <Badge
                      key={suggestion}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => setMetSource(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ta informacja pomoże Ci później przypomnieć sobie skąd znasz te osoby
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data poznania (opcjonalne)
                </Label>
                <Input
                  type="date"
                  value={metDate}
                  onChange={(e) => setMetDate(e.target.value)}
                />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Podsumowanie importu</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Liczba kontaktów:</strong> {parsedContacts.length}</p>
                  <p><strong>Grupa docelowa:</strong> {selectedGroupId ? groups?.find(g => g.id === selectedGroupId)?.name : 'Inne'}</p>
                  {metSource && <p><strong>Skąd poznani:</strong> {metSource}</p>}
                  {metDate && <p><strong>Data poznania:</strong> {new Date(metDate).toLocaleDateString('pl-PL')}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step: Duplicates */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {newContacts.length} nowych
                </Badge>
                <Badge variant="secondary">
                  <Merge className="h-3 w-3 mr-1" />
                  {duplicates.length} duplikatów
                </Badge>
              </div>

              <ScrollArea className="h-[350px]">
                <div className="space-y-4 pr-4">
                  {duplicates.map((dup, idx) => (
                    <DuplicateCard
                      key={idx}
                      duplicate={dup}
                      onDecisionChange={(decision) => updateDuplicateDecision(idx, decision)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{progress.stage}</p>
              <div className="w-full max-w-xs">
                <Progress value={(progress.current / progress.total) * 100} />
              </div>
              <p className="text-sm text-muted-foreground">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="rounded-full bg-green-500/10 p-4">
                <Check className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-lg font-medium">Import zakończony!</p>
              <p className="text-sm text-muted-foreground">
                Kontakty zostały zaimportowane do systemu.
              </p>
            </div>
          )}
        </div>

        {/* Progress bar for parsing/checking */}
        {(isParsing || isCheckingDuplicates) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{progress.stage}</span>
            </div>
            {progress.total > 0 && (
              <Progress value={(progress.current / progress.total) * 100} />
            )}
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-between pt-4 border-t">
          {step === 'source' && (
            <>
              <Button variant="outline" onClick={handleClose}>Anuluj</Button>
              <Button 
                onClick={handleAnalyze}
                disabled={isParsing || (uploadedFiles.length === 0 && !pastedText.trim())}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizowanie...
                  </>
                ) : (
                  <>
                    Analizuj dane
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('source')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wróć
              </Button>
              <Button 
                onClick={handleAcceptList}
                disabled={parsedContacts.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Zaakceptuj listę
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'settings' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wróć
              </Button>
              <Button 
                onClick={handleCheckDuplicates}
                disabled={isCheckingDuplicates}
              >
                {isCheckingDuplicates ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sprawdzanie...
                  </>
                ) : (
                  <>
                    Sprawdź duplikaty
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'duplicates' && (
            <>
              <Button variant="outline" onClick={() => setStep('settings')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wróć
              </Button>
              <Button onClick={handleImport}>
                Importuj
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'complete' && (
            <div className="w-full flex justify-end">
              <Button onClick={handleClose}>Zamknij</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Duplicate Card Component
interface DuplicateCardProps {
  duplicate: DuplicateMatch;
  onDecisionChange: (decision: 'merge' | 'new' | 'skip') => void;
}

function DuplicateCard({ duplicate, onDecisionChange }: DuplicateCardProps) {
  const { parsedContact, existingContact, decision } = duplicate;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {parsedContact.first_name} {parsedContact.last_name}
        </span>
        <Badge variant="outline">Potencjalny duplikat</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase">W systemie:</p>
          <p>{existingContact.full_name}</p>
          <p className="text-muted-foreground">{existingContact.email || 'brak email'}</p>
          <p className="text-muted-foreground">{existingContact.phone || 'brak telefonu'}</p>
          <p className="text-muted-foreground">{existingContact.company || 'brak firmy'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase">Z importu:</p>
          <p>{parsedContact.first_name} {parsedContact.last_name}</p>
          <p className="text-muted-foreground">{parsedContact.email || 'brak email'}</p>
          <p className="text-muted-foreground">{parsedContact.phone || 'brak telefonu'}</p>
          <p className="text-muted-foreground">{parsedContact.company || 'brak firmy'}</p>
        </div>
      </div>

      <RadioGroup 
        value={decision} 
        onValueChange={(value) => onDecisionChange(value as 'merge' | 'new' | 'skip')}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="merge" id={`merge-${existingContact.id}`} />
          <Label htmlFor={`merge-${existingContact.id}`} className="text-sm cursor-pointer">
            Scal (uzupełnij dane)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="new" id={`new-${existingContact.id}`} />
          <Label htmlFor={`new-${existingContact.id}`} className="text-sm cursor-pointer">
            Utwórz nowy
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="skip" id={`skip-${existingContact.id}`} />
          <Label htmlFor={`skip-${existingContact.id}`} className="text-sm cursor-pointer">
            Pomiń
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}