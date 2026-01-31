import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Factory, Briefcase, Wrench, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityProfile } from './types';

interface ActivityRiskProfileProps {
  profile: ActivityProfile;
  servicesAdvisoryPct: number | null;
  onChange: (profile: ActivityProfile) => void;
  onServicesAdvisoryChange: (pct: number) => void;
}

const ACTIVITIES = [
  {
    key: 'manufacturing' as const,
    label: 'Produkcja',
    riskType: 'Ryzyko Produktowe',
    icon: Factory,
    color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
    activeColor: 'bg-amber-200 dark:bg-amber-900/50 border-amber-500',
  },
  {
    key: 'services' as const,
    label: 'Usługi / Doradztwo',
    riskType: 'OC Zawodowe',
    icon: Briefcase,
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
    activeColor: 'bg-blue-200 dark:bg-blue-900/50 border-blue-500',
  },
  {
    key: 'installation' as const,
    label: 'Instalacje / Prace ręczne',
    riskType: 'OC Ogólna',
    icon: Wrench,
    color: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
    activeColor: 'bg-emerald-200 dark:bg-emerald-900/50 border-emerald-500',
  },
  {
    key: 'trading' as const,
    label: 'Handel / Dystrybucja',
    riskType: 'Trading',
    icon: ShoppingCart,
    color: 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700',
    activeColor: 'bg-violet-200 dark:bg-violet-900/50 border-violet-500',
  },
];

export function ActivityRiskProfile({
  profile,
  servicesAdvisoryPct,
  onChange,
  onServicesAdvisoryChange,
}: ActivityRiskProfileProps) {
  const handleToggle = (key: keyof ActivityProfile) => {
    onChange({ ...profile, [key]: !profile[key] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Profil ryzyka działalności
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Czy przychody pochodzą z...?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {ACTIVITIES.map((activity) => {
            const Icon = activity.icon;
            const isActive = profile[activity.key];

            return (
              <div
                key={activity.key}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all",
                  isActive ? activity.activeColor : activity.color
                )}
                onClick={() => handleToggle(activity.key)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={activity.key}
                    checked={isActive}
                    onCheckedChange={() => handleToggle(activity.key)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <Label 
                        htmlFor={activity.key} 
                        className="font-medium cursor-pointer"
                      >
                        {activity.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({activity.riskType})
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conditional: Services advisory vs manual split */}
        {profile.services && (
          <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
            <Label className="text-sm font-medium">
              Procent doradztwa vs prace manualne
            </Label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-20">Manualne</span>
              <Slider
                value={[servicesAdvisoryPct ?? 50]}
                onValueChange={([v]) => onServicesAdvisoryChange(v)}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-20 text-right">Doradztwo</span>
            </div>
            <div className="text-center text-sm font-medium">
              {servicesAdvisoryPct ?? 50}% doradztwa / {100 - (servicesAdvisoryPct ?? 50)}% prac manualnych
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
