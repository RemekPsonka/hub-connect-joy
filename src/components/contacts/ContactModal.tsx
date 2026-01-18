import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
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
import { useContactGroups, useCreateContact, useUpdateContact, type ContactWithGroup, type Contact } from '@/hooks/useContacts';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { MergeContactModal } from './MergeContactModal';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { generateEmbeddingInBackground } from '@/hooks/useEmbeddings';

const linkedinUrlPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;

const contactSchema = z.object({
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
  source: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000, 'Maksymalnie 2000 znaków').optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: ContactWithGroup | null;
}

const sourceOptions = [
  { value: 'manual', label: 'Ręcznie' },
  { value: 'business_card', label: 'Wizytówka' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'referral', label: 'Polecenie' },
  { value: 'import', label: 'Import' },
];

export function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { data: groups = [] } = useContactGroups();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { checkForDuplicate, mergeContacts, isChecking, isMerging } = useDuplicateCheck();
  const queryClient = useQueryClient();
  
  const [tagInput, setTagInput] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [existingContact, setExistingContact] = useState<Partial<Contact> | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<ContactFormData | null>(null);

  const isEditing = !!contact;

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return;
    
    const currentTags = form.getValues('tags') || [];
    if (!currentTags.includes(trimmedTag)) {
      form.setValue('tags', [...currentTags, trimmedTag]);
    }
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter((_, index) => index !== indexToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
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
      source: '',
      tags: [],
      notes: '',
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        title: contact.title || '',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        position: contact.position || '',
        linkedin_url: contact.linkedin_url || '',
        primary_group_id: contact.primary_group_id || '',
        city: contact.city || '',
        source: contact.source || '',
        tags: contact.tags || [],
        notes: contact.notes || '',
      });
    } else {
      form.reset({
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
        source: '',
        tags: [],
        notes: '',
      });
    }
  }, [contact, form]);

  const prepareSubmitData = (data: ContactFormData) => {
    // Normalize LinkedIn URL - add https:// if missing
    let normalizedLinkedinUrl = data.linkedin_url || null;
    if (normalizedLinkedinUrl && !normalizedLinkedinUrl.startsWith('http')) {
      normalizedLinkedinUrl = `https://${normalizedLinkedinUrl}`;
    }

    // Generate full_name from parts
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
      source: data.source || null,
      notes: data.notes || null,
      tags: data.tags || [],
    };
  };

  const onSubmit = async (data: ContactFormData) => {
    const submitData = prepareSubmitData(data);

    if (isEditing && contact) {
      // Przy edycji nie sprawdzamy duplikatów
      await updateContact.mutateAsync({ id: contact.id, ...submitData });
      onClose();
      return;
    }

    // Sprawdź duplikaty przy tworzeniu nowego kontaktu
    const { isDuplicate, existingContact: foundContact } = await checkForDuplicate(submitData);
    
    if (isDuplicate && foundContact) {
      // Pokaż modal scalania
      setExistingContact(foundContact);
      setPendingSubmitData(data);
      setShowMergeModal(true);
    } else {
      // Brak duplikatu - utwórz normalnie
      await createContact.mutateAsync(submitData);
      onClose();
    }
  };

  const handleMerge = async () => {
    if (!existingContact?.id || !pendingSubmitData) return;
    
    const submitData = prepareSubmitData(pendingSubmitData);
    
    try {
      const mergedContact = await mergeContacts(existingContact.id, submitData);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', mergedContact.id] });
      generateEmbeddingInBackground('contact', mergedContact.id);
      toast.success(`Kontakt scalony: ${mergedContact.full_name}`);
      setShowMergeModal(false);
      onClose();
    } catch (error) {
      console.error('Error merging contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd podczas scalania kontaktów');
    }
  };

  const handleCreateNew = async () => {
    if (!pendingSubmitData) return;
    
    const submitData = prepareSubmitData(pendingSubmitData);
    
    try {
      await createContact.mutateAsync(submitData);
      setShowMergeModal(false);
      onClose();
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

  const isPending = createContact.isPending || updateContact.isPending || isChecking;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edytuj kontakt' : 'Dodaj kontakt'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Podstawowe</TabsTrigger>
                  <TabsTrigger value="additional">Dodatkowe</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
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
                </TabsContent>

                <TabsContent value="additional" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Źródło</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz źródło" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sourceOptions.map((option) => (
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
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagi</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {/* Display existing tags */}
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {field.value.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => removeTag(index)}
                                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {/* Input for new tags */}
                            <div className="flex gap-2">
                              <Input
                                placeholder="Dodaj tag..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                              />
                              <Button type="button" variant="outline" onClick={addTag}>
                                Dodaj
                              </Button>
                            </div>
                          </div>
                        </FormControl>
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
                          <Textarea
                            placeholder="Dodatkowe informacje o kontakcie..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={onClose}>
                  Anuluj
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isChecking ? 'Sprawdzanie...' : 'Zapisywanie...'}
                    </>
                  ) : (
                    'Zapisz'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal scalania */}
      {existingContact && pendingSubmitData && (
        <MergeContactModal
          isOpen={showMergeModal}
          onClose={handleCloseMergeModal}
          existingContact={existingContact}
          newContactData={prepareSubmitData(pendingSubmitData)}
          onMerge={handleMerge}
          onCreateNew={handleCreateNew}
          isMerging={isMerging}
        />
      )}
    </>
  );
}
