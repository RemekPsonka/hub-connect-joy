import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { User, X, Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
}

interface TaskContactFilterProps {
  value: string | undefined;
  onChange: (contactId: string | undefined) => void;
}

export function TaskContactFilter({ value, onChange }: TaskContactFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { director } = useAuth();

  const { data: contacts = [] } = useQuery({
    queryKey: ['filter-contacts', director?.tenant_id, search],
    queryFn: async () => {
      if (!director?.tenant_id) return [];

      let query = supabase
        .from('contacts')
        .select('id, full_name, company')
        .eq('tenant_id', director.tenant_id)
        .order('full_name')
        .limit(20);

      if (search) {
        query = query.ilike('full_name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
    enabled: open && !!director?.tenant_id,
  });

  // Fetch selected contact details if we have a value
  const { data: selectedContact } = useQuery({
    queryKey: ['selected-filter-contact', value],
    queryFn: async () => {
      if (!value) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .eq('id', value)
        .single();

      if (error) return null;
      return data as Contact;
    },
    enabled: !!value,
  });

  const handleSelect = (contactId: string | undefined) => {
    onChange(contactId);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[180px] justify-between",
            value && "border-primary/50"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedContact ? selectedContact.full_name : 'Kontakt'}
            </span>
          </span>
          {value && (
            <X
              className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(undefined);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Szukaj kontaktu..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.length < 2 
                ? 'Wpisz min. 2 znaki...' 
                : 'Nie znaleziono kontaktów'
              }
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => handleSelect(undefined)}
                className="text-muted-foreground"
              >
                <User className="mr-2 h-4 w-4" />
                Wszystkie kontakty
                {!value && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={() => handleSelect(contact.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{contact.full_name}</span>
                    {contact.company && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                  {value === contact.id && <Check className="ml-auto h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
