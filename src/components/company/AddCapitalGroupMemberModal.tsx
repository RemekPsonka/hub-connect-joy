import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAddCapitalGroupMember } from '@/hooks/useCapitalGroupMembers';

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
  const addMember = useAddCapitalGroupMember();
  
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
    
    form.reset();
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj spółkę do grupy kapitałowej</DialogTitle>
        </DialogHeader>
        
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Dodaj spółkę
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
