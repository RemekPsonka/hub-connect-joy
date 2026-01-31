import { useState } from 'react';
import { format, addYears } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PolicyType } from '@/components/renewal/types';

export interface QuickPolicyData {
  policy_type: PolicyType;
  policy_name: string;
  start_date: string;
  end_date: string;
  sum_insured?: number;
  premium?: number;
  is_our_policy?: boolean;
}

interface QuickAddPolicyButtonProps {
  policyType: PolicyType;
  defaultPolicyName: string;
  defaultSumInsured?: number;
  onAdd: (data: QuickPolicyData) => void;
  disabled?: boolean;
}

export function QuickAddPolicyButton({
  policyType,
  defaultPolicyName,
  defaultSumInsured,
  onAdd,
  disabled,
}: QuickAddPolicyButtonProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [sumInsured, setSumInsured] = useState<string>(defaultSumInsured?.toString() || '');
  const [premium, setPremium] = useState<string>('');
  const [isOurPolicy, setIsOurPolicy] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSubmit = () => {
    if (!startDate) return;

    const endDate = addYears(startDate, 1);
    
    onAdd({
      policy_type: policyType,
      policy_name: defaultPolicyName,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      sum_insured: sumInsured ? parseInt(sumInsured) : undefined,
      premium: premium ? parseInt(premium) : undefined,
      is_our_policy: isOurPolicy,
    });

    // Reset form
    setStartDate(undefined);
    setSumInsured(defaultSumInsured?.toString() || '');
    setPremium('');
    setIsOurPolicy(false);
    setOpen(false);
  };

  const endDatePreview = startDate ? format(addYears(startDate, 1), 'dd.MM.yyyy') : '—';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Dodaj do harmonogramu
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Dodaj polisę</h4>
            <p className="text-xs text-muted-foreground">
              {defaultPolicyName}
            </p>
          </div>

          <div className="space-y-3">
            {/* Data rozpoczęcia */}
            <div className="space-y-1.5">
              <Label className="text-xs">Data rozpoczęcia *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd.MM.yyyy') : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setCalendarOpen(false);
                    }}
                    locale={pl}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Koniec: {endDatePreview} (auto +1 rok)
              </p>
            </div>

            {/* Suma ubezpieczenia */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-sum" className="text-xs">Suma ubezpieczenia (PLN)</Label>
              <Input
                id="quick-sum"
                type="number"
                min={0}
                placeholder="np. 45000000"
                value={sumInsured}
                onChange={(e) => setSumInsured(e.target.value)}
                className="h-8"
              />
            </div>

            {/* Składka szacowana */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-premium" className="text-xs">Składka szacowana (PLN)</Label>
              <Input
                id="quick-premium"
                type="number"
                min={0}
                placeholder="np. 120000"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                className="h-8"
              />
            </div>

            {/* Nasza polisa */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isOurPolicy}
                onCheckedChange={(checked) => setIsOurPolicy(checked === true)}
              />
              <span className="text-sm">Nasza polisa (obsługujemy)</span>
            </label>
          </div>

          {/* Akcje */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!startDate}
            >
              Dodaj
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
