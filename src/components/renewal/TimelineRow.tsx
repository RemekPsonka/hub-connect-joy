import { PolicyBar } from './PolicyBar';
import { POLICY_TYPE_LABELS, type InsurancePolicy, type PolicyType, type RenewalChecklist } from './types';

interface TimelineRowProps {
  policyType: PolicyType;
  policies: InsurancePolicy[];
  timelineStart: Date;
  timelineEnd: Date;
  periodCount: number;
  darkMode: boolean;
  criticalPolicyIds: Set<string>;
  showCriticalPath: boolean;
  onChecklistChange: (policyId: string, key: keyof RenewalChecklist, value: boolean) => void;
  onEditPolicy: (policy: InsurancePolicy) => void;
  onDeletePolicy: (policyId: string) => void;
}

export function TimelineRow({
  policyType,
  policies,
  timelineStart,
  timelineEnd,
  periodCount,
  darkMode,
  criticalPolicyIds,
  showCriticalPath,
  onChecklistChange,
  onEditPolicy,
  onDeletePolicy,
}: TimelineRowProps) {
  const filteredPolicies = policies.filter(p => p.policy_type === policyType);

  if (filteredPolicies.length === 0) return null;

  return (
    <div className="flex border-b last:border-b-0">
      {/* Row label */}
      <div
        className={`w-32 shrink-0 p-3 text-sm font-medium border-r flex items-center ${
          darkMode ? 'bg-slate-900 text-slate-200' : 'bg-card'
        }`}
      >
        {POLICY_TYPE_LABELS[policyType]}
      </div>

      {/* Timeline area */}
      <div 
        className={`flex-1 relative min-h-14 ${
          darkMode ? 'bg-slate-950' : 'bg-background'
        }`}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: periodCount }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 border-r last:border-r-0 ${
                darkMode ? 'border-slate-700' : 'border-border/30'
              }`}
            />
          ))}
        </div>

        {/* Policy bars */}
        {filteredPolicies.map(policy => (
          <PolicyBar
            key={policy.id}
            policy={policy}
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            darkMode={darkMode}
            isCritical={criticalPolicyIds.has(policy.id)}
            showCriticalPath={showCriticalPath}
            onChecklistChange={onChecklistChange}
            onEdit={onEditPolicy}
            onDelete={onDeletePolicy}
          />
        ))}
      </div>
    </div>
  );
}
