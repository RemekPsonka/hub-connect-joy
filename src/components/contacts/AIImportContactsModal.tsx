import { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  CreditCard,
  Plus,
  UserPlus
} from 'lucide-react';
import { useAIImport, ParsedContact } from '@/hooks/useAIImport';
import { useContactGroups, useCreateContact } from '@/hooks/useContacts';
import { useDefaultPositions } from '@/hooks/useDefaultPositions';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImportContactRow } from './ImportContactRow';
import { MergeContactModal } from './MergeContactModal';
import { useQueryClient } from '@tanstack/react-query';
import { generateEmbeddingInBackground } from '@/hooks/useEmbeddings';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { Contact } from '@/hooks/useContacts';

interface AIImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultGroupId?: string;
}

type Step = 'source' | 'preview' | 'importing' | 'complete';
type TabValue = 'upload' | 'paste' | 'businessCards' | 'manual';

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

// Schema for manual contact form
const linkedinUrlPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;

const manualContactSchema = z.object({
  title: z.string().max(50, 'Maksymalnie 50 znaków').optional().or(z.literal('')),
  first_name: z.string().min(1, 'Imię jest wymagane').max(50, 'Maksymalnie 50 znaków'),
  last_name: z.string().min(1, 'Nazwisko jest wymagane').max(50, 'Maksymalnie 50 znaków'),
  email: z.string().email('Nieprawidłowy adres email').max(255).optional().or(z.literal('')),
  phone: z.string().max(20, 'Maksymalnie 20 znaków').optional().or(z.literal('')),
  company: z.string().max(100, 'Maksymalnie 100 znaków').optional().or(z.literal('')),
  position: z.string().max(100, 'Maksymalnie 100 znaków').optional().or(z.literal('')),
  linkedin_url: z.string()
    .refine((val) => {
      if (!val || val === '') return true;
      return linkedinUrlPattern.test(val);
    }, 'Nieprawidłowy adres LinkedIn (np. linkedin.com/in/jankowalski)')
    .optional()
    .or(z.literal('')),
  primary_group_id: z.string().optional().or(z.literal('')),
  city: z.string().max(100, 'Maksymalnie 100 znaków').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Maksymalnie 2000 znaków').optional().or(z.literal('')),
});

type ManualContactFormData = z.infer<typeof manualContactSchema>;

export function AIImportContactsModal({ open, onOpenChange, onSuccess, defaultGroupId }: AIImportContactsModalProps) {
  const [step, setStep] = useState<Step>('source');
  const [pastedText, setPastedText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId || '');
  const [metSource, setMetSource] = useState('');
  const [metDate, setMetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [businessCardFiles, setBusinessCardFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const businessCardInputRef = useRef<HTMLInputElement>(null);
  
  // Manual form state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [existingContact, setExistingContact] = useState<Partial<Contact> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<ManualContactFormData | null>(null);

  const { data: groups = [] } = useContactGroups();
  const { data: defaultPositions = [] } = useDefaultPositions();
  const createContact = useCreateContact();
  const { checkForDuplicate, mergeContacts, isChecking, isMerging } = useDuplicateCheck();
  const queryClient = useQueryClient();
  
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

  // Form for manual entry
  const form = useForm<ManualContactFormData>({
    resolver: zodResolver(manualContactSchema),
    defaultValues: {
      title: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      linkedin_url: '',
      primary_group_id: '',
      city: '',
      notes: '',
    },
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('source');
      setPastedText('');
      setSelectedGroupId(defaultGroupId || '');
      setMetSource('');
      setMetDate(new Date().toISOString().split('T')[0]);
      setUploadedFiles([]);
      setBusinessCardFiles([]);
      setActiveTab('upload');
      reset();
      form.reset();
      setShowMergeModal(false);
      setExistingContact(null);
      setPendingSubmitData(null);
    } else {
      // When opening, set the default group from active filter
      if (defaultGroupId) {
        setSelectedGroupId(defaultGroupId);
      }
    }
  }, [open, reset, form, defaultGroupId]);

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

  // Manual form submission
  const prepareManualSubmitData = (data: ManualContactFormData) => {
    let normalizedLinkedinUrl = data.linkedin_url || null;
    if (normalizedLinkedinUrl && !normalizedLinkedinUrl.startsWith('http')) {
      normalizedLinkedinUrl = `https://${normalizedLinkedinUrl}`;
    }

    const fullName = [data.title, data.first_name, data.last_name]
      .filter(Boolean)
      .join(' ');

    return {
      title: data.title || null,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: fullName,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      position: data.position || null,
      linkedin_url: normalizedLinkedinUrl,
      primary_group_id: data.primary_group_id || null,
      city: data.city || null,
      source: 'manual',
      notes: data.notes || null,
      tags: [],
    };
  };

  const onManualSubmit = async (data: ManualContactFormData) => {
    const submitData = prepareManualSubmitData(data);

    const { isDuplicate, existingContact: foundContact } = await checkForDuplicate(submitData);
    
    if (isDuplicate && foundContact) {
      setExistingContact(foundContact);
      setPendingSubmitData(data);
      setShowMergeModal(true);
    } else {
      await createContact.mutateAsync(submitData);
      toast.success('Kontakt został dodany');
      onSuccess?.();
      handleClose();
    }
  };

  const handleMerge = async () => {
    if (!existingContact?.id || !pendingSubmitData) return;
    
    const submitData = prepareManualSubmitData(pendingSubmitData);
    
    try {
      const mergedContact = await mergeContacts(existingContact.id, submitData);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', mergedContact.id] });
      generateEmbeddingInBackground('contact', mergedContact.id);
      toast.success(`Kontakt scalony: ${mergedContact.full_name}`);
      setShowMergeModal(false);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error merging contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd podczas scalania kontaktów');
    }
  };

  const handleCreateNew = async () => {
    if (!pendingSubmitData) return;
    
    const submitData = prepareManualSubmitData(pendingSubmitData);
    
    try {
      await createContact.mutateAsync(submitData);
      toast.success('Kontakt został dodany');
      setShowMergeModal(false);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Nie udało się utworzyć kontaktu');
    }
  };

  const handleCloseMergeModal = () => {
    setShowMergeModal(false);
    setExistingContact(null);
    setPendingSubmitData(null);
  };

  const selectedCount = parsedContacts.filter(c => c.selected).length;
  const allSelected = parsedContacts.length > 0 && selectedCount === parsedContacts.length;

  const isManualPending = createContact.isPending || isChecking;
  const canAnalyze = (activeTab === 'upload' && uploadedFiles.length > 0) || 
                     (activeTab === 'paste' && pastedText.trim()) || 
                     (activeTab === 'businessCards' && businessCardFiles.length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Dodaj kontakt
            </DialogTitle>
            <DialogDescription>
              {step === 'source' && activeTab === 'manual' && 'Wprowadź dane kontaktu ręcznie'}
              {step === 'source' && activeTab === 'upload' && 'Wgraj pliki z listą kontaktów (CSV, Excel, PDF, zdjęcia)'}
              {step === 'source' && activeTab === 'paste' && 'Wklej tekst z danymi kontaktów'}
              {step === 'source' && activeTab === 'businessCards' && 'Zeskanuj wizytówki (jedno zdjęcie może zawierać wiele wizytówek)'}
              {step === 'preview' && 'Sprawdź, edytuj i wzbogać kontakty przed importem'}
              {step === 'importing' && 'Trwa importowanie kontaktów...'}
              {step === 'complete' && 'Import zakończony'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Step: Source */}
            {step === 'source' && (
              <div className="space-y-4 flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="manual" className="flex items-center gap-1">
                      <UserPlus className="h-4 w-4" />
                      <span>Ręcznie</span>
                    </TabsTrigger>
                    <TabsTrigger value="upload">Wgraj pliki</TabsTrigger>
                    <TabsTrigger value="paste">Wklej tekst</TabsTrigger>
                    <TabsTrigger value="businessCards" className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      <span>Wizytówki</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Manual entry tab */}
                  <TabsContent value="manual" className="space-y-4 flex-1">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-4">
                        {/* Title, First Name, Last Name row */}
                        <div className="grid grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tytuł</FormLabel>
                                <FormControl>
                                  <Input placeholder="dr, prof." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Imię *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jan" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="last_name"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Nazwisko *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Kowalski" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="jan@firma.pl" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefon</FormLabel>
                                <FormControl>
                                  <Input placeholder="+48 123 456 789" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Firma</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nazwa firmy" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="position"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stanowisko</FormLabel>
                                <FormControl>
                                  <Input placeholder="CEO" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="linkedin_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://linkedin.com/in/jankowalski" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Miasto</FormLabel>
                                <FormControl>
                                  <Input placeholder="Warszawa" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="primary_group_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grupa główna</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Wybierz grupę" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {groups.map((group) => (
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notatki</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Dodatkowe informacje o kontakcie..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </TabsContent>

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
            {step === 'source' && activeTab === 'manual' && (
              <>
                <Button variant="outline" onClick={handleClose}>Anuluj</Button>
                <Button 
                  onClick={form.handleSubmit(onManualSubmit)}
                  disabled={isManualPending}
                >
                  {isManualPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Dodawanie...
                    </>
                  ) : (
                    <>
                      Dodaj kontakt
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            )}

            {step === 'source' && activeTab !== 'manual' && (
              <>
                <Button variant="outline" onClick={handleClose}>Anuluj</Button>
                <Button 
                  onClick={handleAnalyze}
                  disabled={isParsing || !canAnalyze}
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

      {/* Merge modal for manual entry */}
      <MergeContactModal
        isOpen={showMergeModal}
        onClose={handleCloseMergeModal}
        existingContact={existingContact || {}}
        newContactData={pendingSubmitData ? prepareManualSubmitData(pendingSubmitData) : {}}
        onMerge={handleMerge}
        onCreateNew={handleCreateNew}
        isMerging={isMerging}
      />
    </>
  );
}
