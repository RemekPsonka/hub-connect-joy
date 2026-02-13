import { useState, useEffect } from 'react';
import { Loader2, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDealTeamWithMembers, useUpdateDealTeam } from '@/hooks/useDealTeams';
import { toast } from 'sonner';

interface StatusFrequencyConfigProps {
  teamId: string;
}

const STAGES = [
  { key: 'hot', label: 'HOT LEAD' },
  { key: 'offering', label: 'OFERTOWANIE' },
  { key: 'top', label: 'TOP LEAD' },
  { key: 'lead', label: 'LEAD' },
  { key: '10x', label: '10x' },
  { key: 'cold', label: 'COLD' },
  { key: 'client', label: 'KLIENCI' },
  { key: 'lost', label: 'PRZEGRANE' },
] as const;

const DEFAULT_FREQUENCIES: Record<string, number> = {
  hot: 7,
  offering: 7,
  top: 30,
  lead: 0,
  '10x': 30,
  cold: 0,
  client: 30,
  lost: 0,
};

const PRESET_OPTIONS = [
  { value: '0', label: 'Brak wymagania' },
  { value: '7', label: 'Co tydzień' },
  { value: '14', label: 'Co 2 tygodnie' },
  { value: '30', label: 'Co miesiąc' },
  { value: 'custom', label: 'Własne...' },
];

export function StatusFrequencyConfig({ teamId }: StatusFrequencyConfigProps) {
  const { data: team } = useDealTeamWithMembers(teamId);
  const updateTeam = useUpdateDealTeam();

  const [frequencies, setFrequencies] = useState<Record<string, number>>(DEFAULT_FREQUENCIES);
  const [customInputs, setCustomInputs] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (team) {
      const saved = (team as any).status_frequency_days as Record<string, number> | null;
      if (saved) {
        setFrequencies({ ...DEFAULT_FREQUENCIES, ...saved });
      }
    }
  }, [team]);

  const handlePresetChange = (stageKey: string, value: string) => {
    if (value === 'custom') {
      setCustomInputs((prev) => ({ ...prev, [stageKey]: true }));
    } else {
      const days = parseInt(value, 10);
      setFrequencies((prev) => ({ ...prev, [stageKey]: days }));
      setCustomInputs((prev) => ({ ...prev, [stageKey]: false }));
      setIsDirty(true);
    }
  };

  const handleCustomChange = (stageKey: string, value: string) => {
    const days = Math.max(0, parseInt(value, 10) || 0);
    setFrequencies((prev) => ({ ...prev, [stageKey]: days }));
    setIsDirty(true);
  };

  const getSelectValue = (stageKey: string): string => {
    if (customInputs[stageKey]) return 'custom';
    const days = frequencies[stageKey] ?? 0;
    if ([0, 7, 14, 30].includes(days)) return String(days);
    return 'custom';
  };

  const handleSave = async () => {
    await updateTeam.mutateAsync({
      id: teamId,
      statusFrequencyDays: frequencies,
    });
    setIsDirty(false);
    toast.success('Częstotliwość statusów zapisana');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Częstotliwość statusów</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Ustaw jak często wymagany jest status dla każdego etapu lejka.
      </p>

      <div className="space-y-3">
        {STAGES.map((stage) => {
          const isCustom = customInputs[stage.key] || ![0, 7, 14, 30].includes(frequencies[stage.key] ?? 0);
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <Label className="w-28 text-xs font-medium shrink-0">
                {stage.label}
              </Label>
              <Select
                value={getSelectValue(stage.key)}
                onValueChange={(v) => handlePresetChange(stage.key, v)}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCustom && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={frequencies[stage.key] || ''}
                    onChange={(e) => handleCustomChange(stage.key, e.target.value)}
                    className="h-8 w-16 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">dni</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSave}
        disabled={!isDirty || updateTeam.isPending}
        size="sm"
        className="w-full gap-2"
      >
        {updateTeam.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Zapisz częstotliwość
      </Button>
    </div>
  );
}
