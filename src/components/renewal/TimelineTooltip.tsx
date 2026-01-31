import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { CHECKLIST_LABELS, type RenewalChecklist, type InsurancePolicy } from './types';

interface TimelineTooltipProps {
  policy: InsurancePolicy;
  onChecklistChange: (key: keyof RenewalChecklist, value: boolean) => void;
}

export function TimelineTooltip({ policy, onChecklistChange }: TimelineTooltipProps) {
  const endDate = new Date(policy.end_date);
  const today = new Date();
  const daysLeft = differenceInDays(endDate, today);
  
  const isExpired = daysLeft < 0;
  const isInDanger = daysLeft >= 0 && daysLeft <= 30;
  const isInAction = daysLeft > 30 && daysLeft <= 90;

  return (
    <div className="p-3 max-w-xs">
      <div className="mb-2">
        <div className="font-semibold text-sm">
          {isInAction ? 'FAZA DZIAŁAŃ (90 DNI)' : isInDanger ? 'STREFA ZAGROŻENIA' : isExpired ? 'PRZETERMINOWANA' : 'AKTYWNA POLISA'}
        </div>
        <div className="text-xs text-muted-foreground">
          {isInAction ? 'Okno Przetargu i Negocjacji' : policy.policy_name}
        </div>
      </div>

      <div className="border-t pt-2 mb-2">
        <div className="text-xs font-medium mb-1.5">Checklist:</div>
        <div className="space-y-1.5">
          {(Object.keys(CHECKLIST_LABELS) as Array<keyof RenewalChecklist>).map(key => (
            <label 
              key={key} 
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
            >
              <Checkbox
                checked={policy.renewal_checklist[key]}
                onCheckedChange={(checked) => onChecklistChange(key, checked === true)}
                className="h-3.5 w-3.5"
              />
              <span className={policy.renewal_checklist[key] ? 'line-through text-muted-foreground' : ''}>
                {CHECKLIST_LABELS[key]}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t pt-2 text-xs space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pozostało:</span>
          <span className={`font-medium ${isExpired ? 'text-destructive' : isInDanger ? 'text-amber-500' : ''}`}>
            {isExpired ? `${Math.abs(daysLeft)} dni po terminie` : `${daysLeft} dni`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Wygaśnięcie:</span>
          <span>{format(endDate, 'd MMM yyyy', { locale: pl })}</span>
        </div>
        {policy.insurer_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ubezpieczyciel:</span>
            <span>{policy.insurer_name}</span>
          </div>
        )}
        {policy.premium && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Składka:</span>
            <span>{policy.premium.toLocaleString('pl-PL')} PLN</span>
          </div>
        )}
      </div>
    </div>
  );
}
