import { useState, useRef } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Contact {
  id: string;
  full_name: string;
  company: string | null;
}

interface ConnectionContactSelectProps {
  value: string | null;
  onChange: (contactId: string | null) => void;
  placeholder?: string;
  excludeIds?: string[];
}

export function ConnectionContactSelect({
  value,
  onChange,
  placeholder = 'Wybierz kontakt...',
  excludeIds = [],
}: ConnectionContactSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { director } = useAuth();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-connection', director?.tenant_id],
    queryFn: async () => {
      if (!director?.tenant_id) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .eq('tenant_id', director.tenant_id)
        .eq('is_active', true)
        .order('full_name')
        .limit(100);

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!director?.tenant_id,
    staleTime: 60000,
  });

  const filteredContacts = contacts.filter((contact) => {
    if (excludeIds.includes(contact.id)) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contact.full_name.toLowerCase().includes(searchLower) ||
      (contact.company?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const selectedContact = contacts.find((c) => c.id === value);

  const listRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredContacts.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedContact ? (
            <span className="truncate">{selectedContact.full_name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Szukaj kontaktu..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Brak kontaktów</CommandEmpty>
            <div ref={listRef} className="max-h-[300px] overflow-auto">
              <CommandGroup>
                <div
                  style={{
                    height: virtualizer.getTotalSize(),
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const contact = filteredContacts[virtualRow.index];
                    return (
                      <CommandItem
                        key={contact.id}
                        value={contact.id}
                        onSelect={() => {
                          onChange(contact.id);
                          setOpen(false);
                          setSearch('');
                        }}
                        className="cursor-pointer absolute w-full"
                        style={{
                          top: 0,
                          left: 0,
                          height: 48,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === contact.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{contact.full_name}</span>
                          {contact.company && (
                            <span className="text-xs text-muted-foreground">
                              {contact.company}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
