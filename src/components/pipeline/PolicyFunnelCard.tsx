import { differenceInDays, format } from 'date-fns';
import { Building2, Calendar, Check, Circle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { POLICY_TYPE_LABELS, POLICY_TYPE_COLORS, CHECKLIST_LABELS, type PolicyType, type RenewalChecklist } from '@/components/renewal/types';
import type { PolicyWithCompany } from '@/hooks/useAllPolicies';

interface PolicyFunnelCardProps {
  policy: PolicyWithCompany;
  showChecklist?: boolean;
  onChecklistChange?: (policyId: string, checklist: RenewalChecklist) => void;
  onToggleOurPolicy?: (policyId: string, isOurs: boolean) => void;
}

export function PolicyFunnelCard({
  policy,
  showChecklist = false,
  onChecklistChange,
  onToggleOurPolicy,
}: PolicyFunnelCardProps) {
  const daysLeft = differenceInDays(new Date(policy.end_date), new Date());
  const isUrgent = daysLeft <= 30;
  const isOurs = policy.is_our_policy;

  const completedItems = Object.values(policy.renewal_checklist).filter(Boolean).length;
  const totalItems = Object.keys(policy.renewal_checklist).length;

  const handleChecklistToggle = (key: keyof RenewalChecklist) => {
    if (!onChecklistChange) return;
    
    const newChecklist = {
      ...policy.renewal_checklist,
      [key]: !policy.renewal_checklist[key],
    };
    onChecklistChange(policy.id, newChecklist);
  };

  return (
    <div className="p-3 bg-background rounded-lg border mb-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs shrink-0"
              style={{
                borderColor: POLICY_TYPE_COLORS[policy.policy_type as PolicyType],
                color: POLICY_TYPE_COLORS[policy.policy_type as PolicyType],
              }}
            >
              {POLICY_TYPE_LABELS[policy.policy_type as PolicyType]}
            </Badge>
            {isOurs && (
              <Badge variant="default" className="text-xs shrink-0">
                Nasza
              </Badge>
            )}
          </div>
          
          <h4 className="font-medium text-sm mt-1 truncate">
            {policy.policy_name}
          </h4>
          
          {policy.company && (
            <Link
              to={`/companies/${policy.company.id}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1"
            >
              <Building2 className="h-3 w-3" />
              <span className="truncate">
                {policy.company.short_name || policy.company.name}
              </span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className={`text-xs font-medium ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
            {daysLeft < 0 ? (
              <span className="text-destructive">Wygasła</span>
            ) : (
              <span>{daysLeft} dni</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(policy.end_date), 'dd.MM.yyyy')}
          </div>
        </div>
      </div>

      {/* Składka i broker */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>
          {policy.premium
            ? `${new Intl.NumberFormat('pl-PL').format(policy.premium)} PLN`
            : 'Brak składki'}
        </span>
        {policy.insurer_name && (
          <span className="truncate max-w-[120px]">{policy.insurer_name}</span>
        )}
      </div>

      {/* Checklist */}
      {showChecklist && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Checklist</span>
            <span className="text-xs text-muted-foreground">
              {completedItems}/{totalItems}
            </span>
          </div>
          {(Object.keys(CHECKLIST_LABELS) as Array<keyof RenewalChecklist>).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`${policy.id}-${key}`}
                checked={policy.renewal_checklist[key]}
                onCheckedChange={() => handleChecklistToggle(key)}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor={`${policy.id}-${key}`}
                className={`text-xs cursor-pointer ${
                  policy.renewal_checklist[key]
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                }`}
              >
                {CHECKLIST_LABELS[key]}
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Toggle nasza polisa */}
      {onToggleOurPolicy && (
        <div className="mt-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => onToggleOurPolicy(policy.id, !isOurs)}
          >
            {isOurs ? 'Oznacz jako obcą' : 'Oznacz jako naszą'}
          </Button>
        </div>
      )}
    </div>
  );
}
