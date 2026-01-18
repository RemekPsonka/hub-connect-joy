import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileSpreadsheet, 
  Upload, 
  FileText, 
  Image, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Users,
  AlertTriangle,
  X,
  MapPin,
  Calendar,
  Sparkles,
  Building2,
  Search,
  CreditCard
} from 'lucide-react';
import { useAIImport, ParsedContact } from '@/hooks/useAIImport';
import { useContactGroups } from '@/hooks/useContacts';
import { useDefaultPositions } from '@/hooks/useDefaultPositions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImportContactRow } from './ImportContactRow';

interface AIImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'source' | 'preview' | 'importing' | 'complete';

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
  const [businessCardFiles, setBusinessCardFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'businessCards'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const businessCardInputRef = useRef<HTMLInputElement>(null);

  const { data: groups = [] } = useContactGroups();
  const { data: defaultPositions = [] } = useDefaultPositions();
  const {
    isParsing,
    isImporting,
    parsedContacts,
    metadata,
    errors,
    progress,
    stats,
    parseFiles,
    parseText,
    parseBatchBusinessCards,
    updateParsedContact,
    removeParsedContact,
    enrichCompany,
    enrichPerson,
    enrichAllCompanies,
    enrichAllPersons,
    applyDefaultsToAll,
    toggleContactSelection,
    toggleAllSelection,
    importContacts,
    reset
  } = useAIImport();

  // Find "Inne" group as default
  const defaultGroup = groups.find(g => g.name.toLowerCase() === 'inne');
  const defaultPosition = defaultPositions.find(p => p.is_default)?.name || 'Inny';

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('source');
      setPastedText('');
      setSelectedGroupId('');
      setMetSource('');
      setMetDate(new Date().toISOString().split('T')[0]);
      setUploadedFiles([]);
      setBusinessCardFiles([]);
      setActiveTab('upload');
      reset();
    }
  }, [open, reset]);

  // Transition to preview when contacts are parsed
  useEffect(() => {
    if (step === 'source' && parsedContacts.length > 0 && !isParsing) {
      setStep('preview');
    }
  }, [parsedContacts, isParsing, step]);

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

  const handleBusinessCardFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setBusinessCardFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removeBusinessCardFile = useCallback((index: number) => {
    setBusinessCardFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAnalyze = async () => {
    if (activeTab === 'businessCards' && businessCardFiles.length > 0) {
      await parseBatchBusinessCards(businessCardFiles);
    } else if (uploadedFiles.length > 0) {
      await parseFiles(uploadedFiles);
    } else if (pastedText.trim()) {
      await parseText(pastedText);
    }
  };

  const handleApplyDefaults = () => {
    applyDefaultsToAll(
      selectedGroupId || defaultGroup?.id || null,
      metSource || null,
      metDate || null
    );
    toast.success('Zastosowano domyślne ustawienia do wszystkich kontaktów');
  };

  const handleImport = async () => {
    // Apply defaults before import
    applyDefaultsToAll(
      selectedGroupId || defaultGroup?.id || null,
      metSource || null,
      metDate || null
    );

    setStep('importing');
    const result = await importContacts();
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

  const selectedCount = parsedContacts.filter(c => c.selected).length;
  const allSelected = parsedContacts.length > 0 && selectedCount === parsedContacts.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Profesjonalny import kontaktów
          </DialogTitle>
          <DialogDescription>
            {step === 'source' && 'Wgraj pliki, wklej dane lub zeskanuj wizytówki'}
            {step === 'preview' && 'Sprawdź, edytuj i wzbogać kontakty przed importem'}
            {step === 'importing' && 'Trwa importowanie kontaktów...'}
            {step === 'complete' && 'Import zakończony'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Step: Source */}
          {step === 'source' && (
            <div className="space-y-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'paste' | 'businessCards')} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">Wgraj pliki</TabsTrigger>
                  <TabsTrigger value="paste">Wklej tekst</TabsTrigger>
                  <TabsTrigger value="businessCards" className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Wizytówki</span>
                  </TabsTrigger>
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

                <TabsContent value="businessCards" className="space-y-4">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                      dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                    )}
                    onClick={() => businessCardInputRef.current?.click()}
                  >
                    <CreditCard className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Kliknij aby wybrać zdjęcia wizytówek
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Jedno zdjęcie może zawierać wiele wizytówek (np. rozłożonych na stole)
                    </p>
                    <p className="text-xs text-primary mt-2">
                      AI automatycznie rozpozna i wyekstrahuje dane z każdej wizytówki
                    </p>
                    <input
                      ref={businessCardInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleBusinessCardFileChange}
                    />
                  </div>

                  {businessCardFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Wybrane zdjęcia ({businessCardFiles.length}):</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {businessCardFiles.map((file, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Wizytówka ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-md border"
                            />
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); removeBusinessCardFile(idx); }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded">
                              {file.name.slice(0, 15)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

          {/* Step: Preview - Single screen with everything */}
          {step === 'preview' && (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Stats bar */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border flex-shrink-0">
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {stats.total} kontaktów
                  </Badge>
                  {stats.duplicates > 0 && (
                    <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      {stats.duplicates} duplikatów
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-300">
                    <Check className="h-3 w-3" />
                    {stats.ready} gotowych
                  </Badge>
                  {stats.companiesNeeded > 0 && (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {stats.companiesNeeded} firm do uzupełnienia
                    </Badge>
                  )}
                </div>
              </div>

              {/* Bulk AI enrichment actions */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">Wzbogać AI:</span>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={enrichAllCompanies}
                  disabled={stats.companiesNeeded === 0 || isImporting || isParsing}
                >
                  <Building2 className="h-3 w-3" />
                  Wszystkie firmy ({stats.companiesNeeded})
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={enrichAllPersons}
                  disabled={stats.personsNeeded === 0 || isImporting || isParsing}
                >
                  <Search className="h-3 w-3" />
                  Wszystkie osoby ({stats.personsNeeded})
                </Button>
                
                <span className="text-xs text-muted-foreground ml-auto">
                  Możesz też wzbogacić pojedyncze kontakty w wierszu
                </span>
              </div>

              {/* Default settings */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="space-y-1.5">
                  <Label className="text-xs">Domyślna grupa</Label>
                  <Select 
                    value={selectedGroupId || 'none'} 
                    onValueChange={(val) => setSelectedGroupId(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Wybierz grupę..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Bez wyboru (→ Inne)</span>
                      </SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: group.color || '#6366f1' }}
                            />
                            {group.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Domyślne źródło
                  </Label>
                  <Input
                    placeholder="np. CC WAW 2025..."
                    value={metSource}
                    onChange={(e) => setMetSource(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <div className="flex flex-wrap gap-1">
                    {metSourceSuggestions.slice(0, 3).map((suggestion) => (
                      <Badge
                        key={suggestion}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors text-[10px] px-1.5 py-0"
                        onClick={() => setMetSource(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Domyślna data
                  </Label>
                  <Input
                    type="date"
                    value={metDate}
                    onChange={(e) => setMetDate(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-8 text-xs"
                    onClick={handleApplyDefaults}
                  >
                    Zastosuj do wszystkich
                  </Button>
                </div>
              </div>

              {/* Contacts table */}
              <div className="flex-1 border rounded-lg overflow-hidden flex flex-col min-h-0">
                {/* Table header */}
                <div className="grid grid-cols-[40px_100px_1fr_1fr_1fr_140px_1fr_1fr_100px_40px] gap-2 py-2 px-2 bg-muted/50 border-b text-xs font-medium flex-shrink-0">
                  <div className="flex justify-center">
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                    />
                  </div>
                  <div>Status</div>
                  <div>Imię</div>
                  <div>Nazwisko</div>
                  <div>Firma</div>
                  <div>Stanowisko</div>
                  <div>Email</div>
                  <div>Telefon</div>
                  <div>Akcje</div>
                  <div></div>
                </div>
                
                {/* Table body - scrollable */}
                <div className="flex-1 overflow-y-auto">
                  {parsedContacts.map((contact, idx) => (
                    <ImportContactRow
                      key={idx}
                      contact={contact}
                      index={idx}
                      groups={groups}
                      defaultPositions={defaultPositions}
                      defaultPosition={defaultPosition}
                      metSourceSuggestions={metSourceSuggestions}
                      onUpdate={updateParsedContact}
                      onRemove={removeParsedContact}
                      onToggleSelect={toggleContactSelection}
                      onEnrichCompany={enrichCompany}
                      onEnrichPerson={enrichPerson}
                    />
                  ))}
                </div>
              </div>
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

        {/* Progress bar for parsing */}
        {isParsing && progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{progress.stage}</span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-between pt-4 border-t">
          {step === 'source' && (
            <>
              <Button variant="outline" onClick={handleClose}>Anuluj</Button>
              <Button 
                onClick={handleAnalyze}
                disabled={isParsing || (uploadedFiles.length === 0 && !pastedText.trim() && businessCardFiles.length === 0)}
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
                Wróć do źródła
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
              >
                Importuj {selectedCount} kontaktów
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
