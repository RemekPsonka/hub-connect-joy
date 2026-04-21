import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUpdateTeamContact } from '@/hooks/useDealsTeamContacts';

interface Props {
  contactId: string;
  teamId: string;
  valueGr: number | null;
}

const formatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});

export function PremiumQuickEdit({ contactId, teamId, valueGr }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(String((valueGr ?? 0) / 100));
  const update = useUpdateTeamContact();

  useEffect(() => {
    if (open) setDraft(String((valueGr ?? 0) / 100));
  }, [open, valueGr]);

  const hasValue = valueGr != null && valueGr > 0;
  const display = hasValue ? formatter.format((valueGr as number) / 100) : '+ składka';

  const handleSave = () => {
    const pln = Number(draft);
    if (Number.isNaN(pln) || pln < 0) return;
    update.mutate(
      {
        id: contactId,
        teamId,
        expectedAnnualPremiumGr: Math.round(pln * 100),
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={hasValue ? 'Edytuj prognozę składki' : 'Dodaj prognozę składki'}
          title={hasValue ? 'Edytuj prognozę składki' : 'Dodaj prognozę składki'}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex"
        >
          <Badge
            variant={hasValue ? 'outline' : 'secondary'}
            className="text-[10px] px-1.5 py-0 h-5 cursor-pointer hover:opacity-80 tabular-nums"
          >
            💰 {display}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label htmlFor={`prem-${contactId}`} className="text-xs">
            Prognoza składki rocznej (PLN)
          </Label>
          <Input
            id={`prem-${contactId}`}
            type="number"
            min={0}
            step={100}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending ? 'Zapisuję…' : 'Zapisz'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
