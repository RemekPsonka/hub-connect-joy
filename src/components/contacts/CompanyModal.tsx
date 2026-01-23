import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, RefreshCw, Loader2, ImageIcon, Calendar, Sparkles, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Company, useUpdateCompany, useRegenerateCompanyAI, getCompanyLogoUrl, useScrapeLogo, useFetchKRS } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const companySchema = z.object({
  name: z.string().min(1, 'Nazwa firmy jest wymagana').max(255),
  short_name: z.string().optional().nullable(),
  legal_form: z.string().optional().nullable(),
  tagline: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  employee_count: z.string().optional().nullable(),
  company_size: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  nip: z.string().optional().nullable(),
  regon: z.string().optional().nullable(),
  krs: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  services: z.string().optional().nullable(),
  collaboration_areas: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  revenue_amount: z.string().optional().nullable(),
  revenue_year: z.string().optional().nullable(),
  revenue_currency: z.string().optional().nullable(),
  growth_rate: z.string().optional().nullable(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
}

const sizeOptions = [
  { value: 'micro', label: 'Mikro (1-9 pracowników)' },
  { value: 'small', label: 'Mała (10-49 pracowników)' },
  { value: 'medium', label: 'Średnia (50-249 pracowników)' },
  { value: 'large', label: 'Duża (250+ pracowników)' },
];

const legalFormOptions = [
  { value: 'sp_z_oo', label: 'Sp. z o.o.' },
  { value: 'sa', label: 'S.A.' },
  { value: 'jednoosobowa', label: 'Jednoosobowa działalność' },
  { value: 'spolka_cywilna', label: 'Spółka cywilna' },
  { value: 'spolka_jawna', label: 'Spółka jawna' },
  { value: 'spolka_partnerska', label: 'Spółka partnerska' },
  { value: 'spolka_komandytowa', label: 'Spółka komandytowa' },
  { value: 'other', label: 'Inna' },
];

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  ownerContactId?: string; // Contact ID to link KRS persons to
}

export function CompanyModal({ open, onOpenChange, company, ownerContactId }: CompanyModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const updateCompany = useUpdateCompany();
  const regenerateAI = useRegenerateCompanyAI();
  const scrapeLogo = useScrapeLogo();
  const fetchKRS = useFetchKRS();

  // Get extended company data
  const extendedCompany = company as Company & {
    short_name?: string | null;
    legal_form?: string | null;
    tagline?: string | null;
    company_size?: string | null;
    revenue_amount?: number | null;
    revenue_year?: number | null;
    revenue_currency?: string | null;
    growth_rate?: number | null;
  };

  // Parse AI analysis - now ai_analysis is JSONB, not string
  const parseAIAnalysis = (aiAnalysis: unknown) => {
    if (!aiAnalysis || typeof aiAnalysis !== 'object') return { services: '', collaboration_areas: '' };
    try {
      const parsed = aiAnalysis as Record<string, unknown>;
      const services = parsed.services;
      const collab = parsed.collaboration_areas;
      return {
        services: Array.isArray(services) ? services.join(', ') : (typeof services === 'string' ? services : ''),
        collaboration_areas: Array.isArray(collab) ? collab.join(', ') : (typeof collab === 'string' ? collab : ''),
      };
    } catch {
      return { services: '', collaboration_areas: '' };
    }
  };

  const aiData = parseAIAnalysis(company.ai_analysis);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name || '',
      short_name: extendedCompany.short_name || '',
      legal_form: extendedCompany.legal_form || '',
      tagline: extendedCompany.tagline || '',
      website: company.website || '',
      industry: company.industry || '',
      employee_count: company.employee_count || '',
      company_size: extendedCompany.company_size || '',
      address: company.address || '',
      city: company.city || '',
      postal_code: company.postal_code || '',
      country: company.country || 'Polska',
      nip: company.nip || '',
      regon: company.regon || '',
      krs: company.krs || '',
      description: company.description || '',
      services: aiData.services,
      collaboration_areas: aiData.collaboration_areas,
      logo_url: company.logo_url || '',
      revenue_amount: extendedCompany.revenue_amount?.toString() || '',
      revenue_year: extendedCompany.revenue_year?.toString() || '',
      revenue_currency: extendedCompany.revenue_currency || 'PLN',
      growth_rate: extendedCompany.growth_rate?.toString() || '',
    },
  });

  useEffect(() => {
    if (open && company) {
      const aiData = parseAIAnalysis(company.ai_analysis);
      const ext = company as typeof extendedCompany;
      form.reset({
        name: company.name || '',
        short_name: ext.short_name || '',
        legal_form: ext.legal_form || '',
        tagline: ext.tagline || '',
        website: company.website || '',
        industry: company.industry || '',
        employee_count: company.employee_count || '',
        company_size: ext.company_size || '',
        address: company.address || '',
        city: company.city || '',
        postal_code: company.postal_code || '',
        country: company.country || 'Polska',
        nip: company.nip || '',
        regon: company.regon || '',
        krs: company.krs || '',
        description: company.description || '',
        services: aiData.services,
        collaboration_areas: aiData.collaboration_areas,
        logo_url: company.logo_url || '',
        revenue_amount: ext.revenue_amount?.toString() || '',
        revenue_year: ext.revenue_year?.toString() || '',
        revenue_currency: ext.revenue_currency || 'PLN',
        growth_rate: ext.growth_rate?.toString() || '',
      });
    }
  }, [open, company, form]);

  const onSubmit = async (data: CompanyFormData) => {
    // ai_analysis is now JSONB, pass as object
    const aiAnalysis = {
      services: data.services ? data.services.split(',').map(s => s.trim()).filter(Boolean) : [],
      collaboration_areas: data.collaboration_areas ? data.collaboration_areas.split(',').map(s => s.trim()).filter(Boolean) : [],
    };

    await updateCompany.mutateAsync({
      id: company.id,
      data: {
        name: data.name,
        short_name: data.short_name || null,
        legal_form: data.legal_form || null,
        tagline: data.tagline || null,
        website: data.website || null,
        industry: data.industry || null,
        employee_count: data.employee_count || null,
        company_size: data.company_size || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        nip: data.nip || null,
        regon: data.regon || null,
        krs: data.krs || null,
        description: data.description || null,
        logo_url: data.logo_url || null,
        revenue_amount: data.revenue_amount ? parseFloat(data.revenue_amount) : null,
        revenue_year: data.revenue_year ? parseInt(data.revenue_year) : null,
        revenue_currency: data.revenue_currency || null,
        growth_rate: data.growth_rate ? parseFloat(data.growth_rate) : null,
        ai_analysis: aiAnalysis,
      },
    });
    onOpenChange(false);
  };

  const handleRegenerateAI = async () => {
    const values = form.getValues();
    const result = await regenerateAI.mutateAsync({
      id: company.id,
      companyName: values.name,
      website: values.website,
      industryHint: values.industry,
    });

    // Update form with new AI data - ai_analysis is now JSONB
    const newAiData = parseAIAnalysis(result.ai_analysis);
    form.setValue('description', result.description || '');
    form.setValue('industry', result.industry || '');
    form.setValue('services', newAiData.services);
    form.setValue('collaboration_areas', newAiData.collaboration_areas);
    form.setValue('logo_url', result.logo_url || '');
  };

  const handleScrapeLogo = async () => {
    const website = form.getValues('website');
    if (!website) return;

    const result = await scrapeLogo.mutateAsync({
      companyId: company.id,
      companyWebsite: website,
    });

    if (result.logo_url) {
      form.setValue('logo_url', result.logo_url);
    }
  };

  const handleFetchKRS = async () => {
    const krsValue = form.getValues('krs');
    if (!krsValue) return;

    const result = await fetchKRS.mutateAsync({
      companyId: company.id,
      krs: krsValue,
      ownerContactId: ownerContactId,
    });

    // Update form fields with KRS data
    if (result.company) {
      if (result.company.nip) form.setValue('nip', result.company.nip);
      if (result.company.regon) form.setValue('regon', result.company.regon);
      if (result.company.address) form.setValue('address', result.company.address);
      if (result.company.city) form.setValue('city', result.company.city);
      if (result.company.postal_code) form.setValue('postal_code', result.company.postal_code);
      if (result.company.legal_form) form.setValue('legal_form', result.company.legal_form);
    }
  };

  const isLoading = updateCompany.isPending || regenerateAI.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Edytuj firmę
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Podstawowe</TabsTrigger>
                <TabsTrigger value="registry">Rejestrowe</TabsTrigger>
                <TabsTrigger value="finance">Finanse</TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-1">
                  AI
                  {company.company_analysis_status === 'completed' && (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa firmy *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="short_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skrócona nazwa</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="np. Atlas Ward" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="legal_form"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma prawna</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz formę" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {legalFormOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hasło / Tagline</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="np. Budujemy przyszłość" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strona www</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branża</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="company_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wielkość firmy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz wielkość" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sizeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Logo section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Logo firmy</h4>
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex gap-3 items-center">
                          <Avatar className="h-14 w-14 border">
                          <AvatarImage 
                              src={field.value || getCompanyLogoUrl(form.watch('website')) || ''} 
                              alt="Logo firmy"
                              key={field.value || 'no-logo'}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <AvatarFallback className="bg-muted">
                              <Building className="h-6 w-6 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                placeholder="https://logo.clearbit.com/example.com"
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleScrapeLogo}
                              disabled={scrapeLogo.isPending || !form.watch('website')}
                            >
                              {scrapeLogo.isPending ? (
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              ) : (
                                <ImageIcon className="h-3 w-3 mr-2" />
                              )}
                              Pobierz logo ze strony
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Zostaw puste, aby automatycznie pobrać logo na podstawie strony www
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Adres</h4>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ulica i numer</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Miasto</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kod pocztowy</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="00-000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kraj</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="registry" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="nip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIP</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="0000000000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>REGON</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="krs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KRS</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="0000000000" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleFetchKRS}
                          disabled={!form.watch('krs') || fetchKRS.isPending}
                          title="Pobierz dane z KRS"
                        >
                          {fetchKRS.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Kliknij ikonę pobierania, aby automatycznie pobrać dane z KRS
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="finance" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Przychody (PLN)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="number"
                            placeholder="np. 10000000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="revenue_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rok przychodów</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="number"
                            placeholder="np. 2024"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waluta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'PLN'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz walutę" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PLN">PLN</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="growth_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wzrost r/r (%)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            type="number"
                            step="0.01"
                            placeholder="np. 15.5"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                {/* AI Status Card */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {company.company_analysis_status === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : company.company_analysis_status === 'in_progress' ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">
                            {company.company_analysis_status === 'completed' 
                              ? 'Analiza AI ukończona'
                              : company.company_analysis_status === 'in_progress'
                              ? 'Analiza w toku...'
                              : 'Brak analizy AI'}
                          </p>
                          {company.company_analysis_date && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Ostatnia: {format(new Date(company.company_analysis_date), 'dd.MM.yyyy HH:mm', { locale: pl })}
                            </p>
                          )}
                          {company.analysis_confidence_score && (
                            <p className="text-sm text-muted-foreground">
                              Pewność danych: {(company.analysis_confidence_score * 100).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateAI}
                        disabled={regenerateAI.isPending}
                      >
                        {regenerateAI.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {company.company_analysis_status === 'completed' ? 'Regeneruj' : 'Uruchom'} analizę AI
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opis firmy</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''} 
                          rows={4}
                          placeholder="Opis wygenerowany przez AI..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usługi (oddzielone przecinkami)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''} 
                          rows={2}
                          placeholder="np. ochrona patentowa, znaki towarowe, audyt IP, wzory przemysłowe..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="collaboration_areas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Obszary współpracy (oddzielone przecinkami)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''} 
                          rows={2}
                          placeholder="np. doradztwo strategiczne, szkolenia, konsultacje prawne..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {updateCompany.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Zapisz zmiany
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
