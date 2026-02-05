import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Check, Building2, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAddCapitalGroupMember, useAddCapitalGroupMemberFromCompany } from '@/hooks/useCapitalGroupMembers';
import { useCompaniesForCapitalGroup } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  external_name: z.string().min(1, 'Nazwa jest wymagana'),
  external_nip: z.string().optional(),
  external_krs: z.string().optional(),
  external_regon: z.string().optional(),
  relationship_type: z.enum(['parent', 'subsidiary', 'affiliate', 'branch']),
  ownership_percent: z.coerce.number().min(0).max(100).optional(),
  revenue_amount: z.coerce.number().optional(),
  revenue_year: z.coerce.number().min(1900).max(2100).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddCapitalGroupMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCompanyId: string;
}

export function AddCapitalGroupMemberModal({
  open,
  onOpenChange,
  parentCompanyId
}: AddCapitalGroupMemberModalProps) {
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; nip: string | null; krs: string | null } | null>(null);
  const [relationshipType, setRelationshipType] = useState<'subsidiary' | 'affiliate' | 'parent' | 'branch'>('subsidiary');
  const [ownershipPercent, setOwnershipPercent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const addMember = useAddCapitalGroupMember();
  const addMemberFromCompany = useAddCapitalGroupMemberFromCompany();
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompaniesForCapitalGroup(parentCompanyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      external_name: '',
      external_nip: '',
      external_krs: '',
      external_regon: '',
      relationship_type: 'affiliate',
      ownership_percent: undefined,
      revenue_amount: undefined,
      revenue_year: new Date().getFullYear() - 1,
    }
  });

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.nip && company.nip.includes(searchQuery))
  );

  // Virtualization
  const companyListRef = useRef<HTMLDivElement>(null);
  const companyVirtualizer = useVirtualizer({
    count: filteredCompanies.length,
    getScrollElement: () => companyListRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const handleSelectCompany = (company: typeof companies[0]) => {
    setSelectedCompany({
      id: company.id,
      name: company.name,
      nip: company.nip,
      krs: company.krs
    });
  };

  const handleAddFromCRM = async () => {
    if (!selectedCompany) return;

    await addMemberFromCompany.mutateAsync({
      parentCompanyId,
      companyId: selectedCompany.id,
      relationshipType,
      ownershipPercent: ownershipPercent ? parseFloat(ownershipPercent) : undefined
    });

    resetAndClose();
  };

  const onSubmit = async (values: FormValues) => {
    await addMember.mutateAsync({
      parent_company_id: parentCompanyId,
      external_name: values.external_name,
      external_nip: values.external_nip || null,
      external_krs: values.external_krs || null,
      external_regon: values.external_regon || null,
      relationship_type: values.relationship_type,
      ownership_percent: values.ownership_percent || null,
      revenue_amount: values.revenue_amount || null,
      revenue_year: values.revenue_year || null,
      data_source: 'manual'
    });

    resetAndClose();
  };

  const resetAndClose = () => {
    form.reset();
    setSelectedCompany(null);
    setRelationshipType('subsidiary');
    setOwnershipPercent('');
    setSearchQuery('');
    setMode('search');
    onOpenChange(false);
  };

  const isPending = addMember.isPending || addMemberFromCompany.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj spółkę do grupy kapitałowej</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'search' | 'manual')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Wybierz z bazy
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dodaj ręcznie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            <Command className="rounded-lg border">
              <CommandInput
                placeholder="Szukaj firmy w CRM..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoadingCompanies ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <CommandEmpty>Nie znaleziono firmy</CommandEmpty>
                    <div ref={companyListRef} className="max-h-[200px] overflow-auto">
                      <CommandGroup>
                        <div
                          style={{
                            height: companyVirtualizer.getTotalSize(),
                            position: 'relative',
                          }}
                        >
                          {companyVirtualizer.getVirtualItems().map((virtualRow) => {
                            const company = filteredCompanies[virtualRow.index];
                            return (
                              <CommandItem
                                key={company.id}
                                value={company.name}
                                onSelect={() => handleSelectCompany(company)}
                                className="cursor-pointer absolute w-full"
                                style={{
                                  top: 0,
                                  left: 0,
                                  height: 56,
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      selectedCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{company.name}</div>
                                    {company.nip && (
                                      <div className="text-xs text-muted-foreground">NIP: {company.nip}</div>
                                    )}
                                  </div>
                                  {company.revenue_amount && (
                                    <Badge variant="secondary" className="text-xs">
                                      {(company.revenue_amount / 1_000_000).toFixed(1)} mln PLN
                                    </Badge>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </div>
                      </CommandGroup>
                    </div>
                  </>
                )}
              </CommandList>
            </Command>

            {selectedCompany && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="text-sm font-medium">{selectedCompany.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedCompany.nip && `NIP: ${selectedCompany.nip}`}
                  {selectedCompany.nip && selectedCompany.krs && ' • '}
                  {selectedCompany.krs && `KRS: ${selectedCompany.krs}`}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Typ powiązania *</label>
                <Select value={relationshipType} onValueChange={(v) => setRelationshipType(v as typeof relationshipType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Spółka matka</SelectItem>
                    <SelectItem value="subsidiary">Spółka zależna</SelectItem>
                    <SelectItem value="affiliate">Spółka stowarzyszona</SelectItem>
                    <SelectItem value="branch">Oddział</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Udział procentowy</label>
                <Input
                  type="number"
                  placeholder="np. 51"
                  min={0}
                  max={100}
                  value={ownershipPercent}
                  onChange={(e) => setOwnershipPercent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Anuluj
              </Button>
              <Button 
                onClick={handleAddFromCRM} 
                disabled={!selectedCompany || isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dodaj spółkę
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="external_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa firmy *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nazwa spółki" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationship_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ powiązania *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">Spółka matka</SelectItem>
                          <SelectItem value="subsidiary">Spółka zależna</SelectItem>
                          <SelectItem value="affiliate">Spółka stowarzyszona</SelectItem>
                          <SelectItem value="branch">Oddział</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="external_nip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIP</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="external_krs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KRS</FormLabel>
                        <FormControl>
                          <Input placeholder="0000123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ownership_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Udział procentowy</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="np. 51"
                          min={0}
                          max={100}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="revenue_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Przychód (PLN)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="np. 1000000"
                            {...field}
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
                        <FormLabel>Rok przychodu</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={String(new Date().getFullYear() - 1)}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetAndClose}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Dodaj spółkę
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
