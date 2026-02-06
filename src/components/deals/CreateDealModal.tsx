import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDeal, DealStage } from '@/hooks/useDeals';
import { useContacts } from '@/hooks/useContacts';
import { useCompaniesList } from '@/hooks/useCompanies';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany'),
  value: z.coerce.number().min(0, 'Wartość musi być >= 0'),
  currency: z.string().default('PLN'),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  stage_id: z.string().min(1, 'Etap jest wymagany'),
  probability: z.number().min(0).max(100),
  expected_close_date: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (data) => data.contact_id || data.company_id,
  {
    message: 'Wybierz kontakt lub firmę',
    path: ['contact_id'],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface CreateDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: DealStage[];
}

export function CreateDealModal({ open, onOpenChange, stages }: CreateDealModalProps) {
  const createDeal = useCreateDeal();
  const { data: contactsData } = useContacts({ pageSize: 100 });
  const { data: companies = [] } = useCompaniesList();
  const [entityType, setEntityType] = useState<'contact' | 'company'>('contact');

  const defaultStage = stages.find((s) => s.position === 0) || stages[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      value: 0,
      currency: 'PLN',
      contact_id: '',
      company_id: '',
      stage_id: defaultStage?.id || '',
      probability: 50,
      expected_close_date: '',
      source: '',
      description: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    await createDeal.mutateAsync({
      title: values.title,
      value: values.value,
      currency: values.currency,
      contact_id: values.contact_id || null,
      company_id: values.company_id || null,
      stage_id: values.stage_id,
      probability: values.probability,
      expected_close_date: values.expected_close_date || null,
      source: values.source || null,
      description: values.description || null,
    });
    form.reset();
    onOpenChange(false);
  };

  const contacts = contactsData?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nowy deal</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tytuł *</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. Wdrożenie systemu CRM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wartość</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waluta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLN">PLN</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact or Company */}
            <div className="space-y-2">
              <FormLabel>Powiązanie *</FormLabel>
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={entityType === 'contact' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEntityType('contact');
                    form.setValue('company_id', '');
                  }}
                >
                  Kontakt
                </Button>
                <Button
                  type="button"
                  variant={entityType === 'company' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEntityType('company');
                    form.setValue('contact_id', '');
                  }}
                >
                  Firma
                </Button>
              </div>

              {entityType === 'contact' ? (
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz kontakt" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz firmę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="stage_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etap *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz etap" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
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
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prawdopodobieństwo: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_close_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oczekiwana data zamknięcia</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Źródło</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz źródło" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="referral">Polecenie</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe informacje o deal..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={createDeal.isPending}>
                {createDeal.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Utwórz deal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
