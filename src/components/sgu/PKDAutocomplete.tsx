import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePKDCodes } from '@/hooks/usePKDCodes';

interface Props {
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
}

export function PKDAutocomplete({ value, onChange, placeholder = 'Wybierz kody PKD…' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: codes = [], isLoading } = usePKDCodes(search);

  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else onChange([...value, code]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length === 0 ? placeholder : `Wybrane: ${value.length}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Szukaj kodu lub nazwy…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading && <div className="p-3 text-sm text-muted-foreground">Ładowanie…</div>}
              <CommandEmpty>Brak wyników.</CommandEmpty>
              <CommandGroup>
                {codes.map((c) => {
                  const checked = value.includes(c.code);
                  return (
                    <CommandItem key={c.code} value={c.code} onSelect={() => toggle(c.code)}>
                      <Check className={cn('mr-2 h-4 w-4', checked ? 'opacity-100' : 'opacity-0')} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-medium">{c.code}</span>
                        <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                      </div>
                      {c.sector && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {c.sector}
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code) => (
            <Badge key={code} variant="secondary" className="gap-1">
              {code}
              <button type="button" onClick={() => toggle(code)} aria-label={`Usuń ${code}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
