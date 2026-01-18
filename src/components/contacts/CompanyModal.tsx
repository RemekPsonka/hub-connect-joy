import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, RefreshCw, Loader2 } from 'lucide-react';
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
import { Company, useUpdateCompany, useRegenerateCompanyAI, getCompanyLogoUrl } from '@/hooks/useCompanies';

const companySchema = z.object({
  name: z.string().min(1, 'Nazwa firmy jest wymagana').max(255),
  website: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  employee_count: z.string().optional().nullable(),
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

export function CompanyModal({ open, onOpenChange, company }: CompanyModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const updateCompany = useUpdateCompany();
  const regenerateAI = useRegenerateCompanyAI();

  // Parse AI analysis
  const parseAIAnalysis = (aiAnalysis: string | null) => {
    if (!aiAnalysis) return { services: '', collaboration_areas: '' };
    try {
      const parsed = JSON.parse(aiAnalysis);
      return {
        services: Array.isArray(parsed.services) ? parsed.services.join(', ') : (parsed.services || ''),
        collaboration_areas: Array.isArray(parsed.collaboration_areas) ? parsed.collaboration_areas.join(', ') : (parsed.collaboration_areas || ''),
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
      website: company.website || '',
      industry: company.industry || '',
      employee_count: company.employee_count || '',
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
    },
  });

  useEffect(() => {
    if (open && company) {
      const aiData = parseAIAnalysis(company.ai_analysis);
      form.reset({
        name: company.name || '',
        website: company.website || '',
        industry: company.industry || '',
        employee_count: company.employee_count || '',
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
      });
    }
  }, [open, company, form]);

  const onSubmit = async (data: CompanyFormData) => {
    const aiAnalysis = JSON.stringify({
      services: data.services ? data.services.split(',').map(s => s.trim()).filter(Boolean) : [],
      collaboration_areas: data.collaboration_areas ? data.collaboration_areas.split(',').map(s => s.trim()).filter(Boolean) : [],
    });

    await updateCompany.mutateAsync({
      id: company.id,
      data: {
        name: data.name,
        website: data.website || null,
        industry: data.industry || null,
        employee_count: data.employee_count || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        nip: data.nip || null,
        regon: data.regon || null,
        krs: data.krs || null,
        description: data.description || null,
        logo_url: data.logo_url || null,
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

    // Update form with new AI data
    const newAiData = parseAIAnalysis(result.ai_analysis);
    form.setValue('description', result.description || '');
    form.setValue('industry', result.industry || '');
    form.setValue('services', newAiData.services);
    form.setValue('collaboration_areas', newAiData.collaboration_areas);
    form.setValue('logo_url', result.logo_url || '');
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Podstawowe</TabsTrigger>
                <TabsTrigger value="registry">Rejestrowe</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
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
                  name="employee_count"
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
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="flex justify-end">
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
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regeneruj analizę AI
                  </Button>
                </div>

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

                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <div className="flex gap-3 items-center">
                        {(field.value || getCompanyLogoUrl(form.watch('website'))) && (
                          <Avatar className="h-12 w-12 border">
                            <AvatarImage 
                              src={field.value || getCompanyLogoUrl(form.watch('website')) || ''} 
                              alt="Logo firmy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <AvatarFallback className="bg-muted">
                              <Building className="h-6 w-6 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''} 
                            placeholder="https://logo.clearbit.com/example.com"
                          />
                        </FormControl>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Zostaw puste, aby automatycznie pobrać logo na podstawie strony www
                      </p>
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
