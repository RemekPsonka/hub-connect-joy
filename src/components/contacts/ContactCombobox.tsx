import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
  primary_group_id: string | null;
  contact_groups: {
    name: string;
  } | null;
}

interface ContactComboboxProps {
  value: string;
  contactId: string | null | undefined;
  onChange: (name: string, contactId: string | null, company: string | null, ccGroup: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function ContactCombobox({
  value,
  contactId,
  onChange,
  placeholder = 'Szukaj kontaktu lub wpisz...',
  className,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const { director } = useAuth();

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Fetch contacts for search
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-search', director?.tenant_id, inputValue],
    queryFn: async () => {
      if (!director?.tenant_id) return [];

      let query = supabase
        .from('contacts')
        .select('id, full_name, company, primary_group_id, contact_groups(name)')
        .eq('tenant_id', director.tenant_id)
        .eq('is_active', true)
        .order('full_name')
        .limit(20);

      if (inputValue && inputValue.length >= 2) {
        query = query.or(`full_name.ilike.%${inputValue}%,company.ilike.%${inputValue}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!director?.tenant_id && open,
    staleTime: 30000,
  });

  const handleSelectContact = (contact: Contact) => {
    setInputValue(contact.full_name);
    onChange(
      contact.full_name, 
      contact.id, 
      contact.company,
      contact.contact_groups?.name || null
    );
    setOpen(false);
  };

  const handleManualEntry = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim(), null, null, null);
      setOpen(false);
    }
  };

  const isLinkedToContact = !!contactId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              <>
                {isLinkedToContact && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs shrink-0">
                    <User className="h-3 w-3" />
                  </Badge>
                )}
                <span className="truncate">{value}</span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Szukaj kontaktu..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              {inputValue.length < 2
                ? 'Wpisz min. 2 znaki...'
                : 'Brak kontaktów'}
            </CommandEmpty>
            {contacts.length > 0 && (
              <CommandGroup heading="Z bazy kontaktów">
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => handleSelectContact(contact)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        contactId === contact.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{contact.full_name}</span>
                      {contact.company && (
                        <span className="text-xs text-muted-foreground">
                          {contact.company}
                        </span>
                      )}
                      {contact.contact_groups?.name && (
                        <span className="text-xs text-primary">
                          Grupa: {contact.contact_groups.name}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {inputValue.trim() && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Wpisz ręcznie">
                  <CommandItem
                    onSelect={handleManualEntry}
                    className="cursor-pointer"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>
                      Dodaj "<strong>{inputValue.trim()}</strong>" jako nowy wpis
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
