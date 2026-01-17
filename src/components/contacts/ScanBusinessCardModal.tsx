import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Loader2, Sparkles, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useBusinessCardOCR, ExtractedContactData, EnrichedCompanyData } from '@/hooks/useBusinessCardOCR';
import { toast } from 'sonner';

interface ScanBusinessCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScanBusinessCardModal({ isOpen, onClose }: ScanBusinessCardModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedContactData | null>(null);
  const [enrichedData, setEnrichedData] = useState<EnrichedCompanyData | null>(null);
  const [enrichCompany, setEnrichCompany] = useState(true);
  const [step, setStep] = useState<'upload' | 'extracted' | 'enriched'>('upload');

  const { 
    scanBusinessCard, 
    enrichCompanyData, 
    createContactWithCompany,
    isScanning, 
    isEnriching,
    isCreating 
  } = useBusinessCardOCR();

  // Form state for editing extracted data
  const [formData, setFormData] = useState<ExtractedContactData>({
    full_name: '',
    position: null,
    company: null,
    email: null,
    phone: null,
    mobile: null,
    website: null,
    address: null,
    city: null,
    linkedin_url: null,
    notes: null,
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Wybierz plik obrazu');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleScan = async () => {
    if (!imagePreview) {
      toast.error('Najpierw wybierz zdjęcie wizytówki');
      return;
    }

    try {
      const data = await scanBusinessCard(imagePreview);
      setExtractedData(data);
      setFormData(data);
      setStep('extracted');
      toast.success('Wizytówka przeanalizowana');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd skanowania');
    }
  };

  const handleEnrichCompany = async () => {
    if (!formData.company) {
      toast.error('Nazwa firmy jest wymagana do wzbogacenia danych');
      return;
    }

    try {
      const data = await enrichCompanyData(
        formData.company,
        formData.website || undefined
      );
      setEnrichedData(data);
      setStep('enriched');
      toast.success('Dane firmy wzbogacone');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd wzbogacania');
    }
  };

  const handleCreateContact = async () => {
    if (!formData.full_name) {
      toast.error('Imię i nazwisko jest wymagane');
      return;
    }

    try {
      await createContactWithCompany({
        contact: {
          full_name: formData.full_name,
          position: formData.position || undefined,
          email: formData.email || undefined,
          phone: formData.phone || formData.mobile || undefined,
          linkedin_url: formData.linkedin_url || undefined,
          city: formData.city || undefined,
          notes: formData.notes || undefined,
        },
        company: formData.company ? {
          name: formData.company,
          website: formData.website || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          industry: enrichedData?.industry,
          description: enrichedData?.description,
          ai_analysis: enrichedData ? JSON.stringify(enrichedData) : undefined,
          employee_count: enrichedData?.employee_count_estimate || undefined,
        } : undefined
      });

      handleClose();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleClose = () => {
    setImagePreview(null);
    setExtractedData(null);
    setEnrichedData(null);
    setStep('upload');
    setFormData({
      full_name: '',
      position: null,
      company: null,
      email: null,
      phone: null,
      mobile: null,
      website: null,
      address: null,
      city: null,
      linkedin_url: null,
      notes: null,
    });
    onClose();
  };

  const updateFormField = (field: keyof ExtractedContactData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || null
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Skanuj wizytówkę
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload Section */}
          <div className="space-y-3">
            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Podgląd wizytówki" 
                  className="w-full rounded-lg border object-contain max-h-48"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                  onClick={() => setImagePreview(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Kliknij aby wybrać zdjęcie wizytówki
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  lub przeciągnij i upuść
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            {step === 'upload' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Wybierz plik
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleScan}
                  disabled={!imagePreview || isScanning}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analizuję...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Skanuj
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Extracted Data Form */}
          {(step === 'extracted' || step === 'enriched') && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="full_name">Imię i nazwisko *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => updateFormField('full_name', e.target.value)}
                    placeholder="Jan Kowalski"
                  />
                </div>

                <div>
                  <Label htmlFor="position">Stanowisko</Label>
                  <Input
                    id="position"
                    value={formData.position || ''}
                    onChange={(e) => updateFormField('position', e.target.value)}
                    placeholder="Dyrektor"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Firma</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => updateFormField('company', e.target.value)}
                    placeholder="ABC Sp. z o.o."
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => updateFormField('email', e.target.value)}
                    placeholder="jan@firma.pl"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => updateFormField('phone', e.target.value)}
                    placeholder="+48 123 456 789"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Strona www</Label>
                  <Input
                    id="website"
                    value={formData.website || ''}
                    onChange={(e) => updateFormField('website', e.target.value)}
                    placeholder="www.firma.pl"
                  />
                </div>

                <div>
                  <Label htmlFor="city">Miasto</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => updateFormField('city', e.target.value)}
                    placeholder="Warszawa"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">Adres</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="ul. Przykładowa 10, 00-001 Warszawa"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    value={formData.linkedin_url || ''}
                    onChange={(e) => updateFormField('linkedin_url', e.target.value)}
                    placeholder="linkedin.com/in/jankowalski"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="notes">Notatki</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => updateFormField('notes', e.target.value)}
                    placeholder="Dodatkowe informacje..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Enrich Company Option */}
              {step === 'extracted' && formData.company && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="enrichCompany"
                    checked={enrichCompany}
                    onCheckedChange={(checked) => setEnrichCompany(!!checked)}
                  />
                  <label
                    htmlFor="enrichCompany"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Wzbogać dane firmy (AI generuje opis)
                  </label>
                </div>
              )}

              {/* Enriched Company Data Preview */}
              {step === 'enriched' && enrichedData && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Dane wzbogacone przez AI
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      enrichedData.confidence === 'high' ? 'bg-green-100 text-green-700' :
                      enrichedData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {enrichedData.confidence === 'high' ? 'Wysoka pewność' :
                       enrichedData.confidence === 'medium' ? 'Średnia pewność' : 'Niska pewność'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Branża:</strong> {enrichedData.industry}</p>
                    <p><strong>Opis:</strong> {enrichedData.description}</p>
                    {enrichedData.services && (
                      <p><strong>Usługi:</strong> {enrichedData.services}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Anuluj
          </Button>
          
          {step === 'extracted' && (
            <>
              {enrichCompany && formData.company ? (
                <Button 
                  onClick={handleEnrichCompany}
                  disabled={isEnriching}
                >
                  {isEnriching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wzbogacam...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Wzbogać i utwórz
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateContact}
                  disabled={isCreating || !formData.full_name}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Tworzę...
                    </>
                  ) : (
                    'Utwórz kontakt'
                  )}
                </Button>
              )}
            </>
          )}

          {step === 'enriched' && (
            <Button 
              onClick={handleCreateContact}
              disabled={isCreating || !formData.full_name}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tworzę...
                </>
              ) : (
                'Utwórz kontakt'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
