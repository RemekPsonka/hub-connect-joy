import { useState } from 'react';
import { Check, User, UserPlus, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTeamDirectors } from '@/hooks/odprawa/useTeamDirectors';
import { cn } from '@/lib/utils';

interface Props {
  dealTeamContactId: string;
  teamId: string;
  contactId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
}

/**
 * Inline picker opiekuna kontaktu w karcie Odprawy.
 * Brak opiekuna → CTA "Przypisz opiekuna" (akcent), z opiekunem → klikalne imię + popover.
 */
export function OwnerInlinePicker({
  dealTeamContactId,
  teamId,
  contactId,
  currentAssigneeId,
  currentAssigneeName,
}: Props) {
  const qc = useQueryClient();
  const directorsQ = useTeamDirectors(teamId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const setAssignee = async (newId: string | null) => {
    if (newId === (currentAssigneeId ?? null)) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('deal_team_contacts')
        .update({ assigned_to: newId })
        .eq('id', dealTeamContactId);
      if (error) throw error;
      toast.success(newId ? 'Opiekun przypisany' : 'Opiekun usunięty');
      qc.invalidateQueries({ queryKey: ['deal_team_contact_for_agenda', contactId, teamId] });
      qc.invalidateQueries({ queryKey: ['deal_team_contact_by_pk'] });
      qc.invalidateQueries({ queryKey: ['odprawa-agenda'] });
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nie udało się zapisać opiekuna';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const directors = directorsQ.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={saving}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors',
            'hover:bg-muted',
            currentAssigneeId
              ? 'text-muted-foreground'
              : 'text-primary font-medium hover:text-primary',
          )}
        >
          {currentAssigneeId ? (
            <>
              <User className="h-3 w-3" />
              <span>{currentAssigneeName ?? 'Opiekun'}</span>
              <ChevronsUpDown className="h-3 w-3 opacity-50" />
            </>
          ) : (
            <>
              <UserPlus className="h-3 w-3" />
              <span>Przypisz opiekuna</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Szukaj dyrektora…" />
          <CommandList>
            <CommandEmpty>
              {directorsQ.isLoading ? 'Ładowanie…' : 'Brak członków zespołu'}
            </CommandEmpty>
            <CommandGroup>
              {directors.map((d) => {
                const selected = d.id === currentAssigneeId;
                return (
                  <CommandItem
                    key={d.id}
                    value={d.full_name}
                    onSelect={() => setAssignee(d.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {d.full_name}
                  </CommandItem>
                );
              })}
              {currentAssigneeId && (
                <CommandItem
                  value="__none__"
                  onSelect={() => setAssignee(null)}
                  className="text-muted-foreground"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Bez opiekuna
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
