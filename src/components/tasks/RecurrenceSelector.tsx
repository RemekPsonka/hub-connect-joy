import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Repeat } from 'lucide-react';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
}

interface RecurrenceSelectorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  none: 'Brak powtarzania',
  daily: 'Codziennie',
  weekly: 'Co tydzień',
  monthly: 'Co miesiąc',
  yearly: 'Co rok',
  custom: 'Własne',
};

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const [mode, setMode] = useState<string>(value?.frequency || 'none');
  const [interval, setInterval] = useState(value?.interval || 1);
  const [customFreq, setCustomFreq] = useState<string>(value?.frequency || 'daily');

  useEffect(() => {
    if (value) {
      if (value.interval > 1) {
        setMode('custom');
        setCustomFreq(value.frequency);
        setInterval(value.interval);
      } else {
        setMode(value.frequency);
      }
    } else {
      setMode('none');
    }
  }, []);

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    if (newMode === 'none') {
      onChange(null);
    } else if (newMode === 'custom') {
      onChange({ frequency: customFreq as RecurrenceRule['frequency'], interval });
    } else {
      onChange({ frequency: newMode as RecurrenceRule['frequency'], interval: 1 });
    }
  };

  const handleIntervalChange = (val: number) => {
    setInterval(val);
    if (mode === 'custom') {
      onChange({ frequency: customFreq as RecurrenceRule['frequency'], interval: val });
    }
  };

  const handleCustomFreqChange = (freq: string) => {
    setCustomFreq(freq);
    if (mode === 'custom') {
      onChange({ frequency: freq as RecurrenceRule['frequency'], interval });
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Repeat className="h-3.5 w-3.5" />
        Powtarzanie
      </Label>
      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {mode === 'custom' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Co</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={interval}
            onChange={(e) => handleIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-8 w-16 text-sm"
          />
          <Select value={customFreq} onValueChange={handleCustomFreqChange}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">dni</SelectItem>
              <SelectItem value="weekly">tygodni</SelectItem>
              <SelectItem value="monthly">miesięcy</SelectItem>
              <SelectItem value="yearly">lat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function getRecurrenceLabel(rule: RecurrenceRule | null): string | null {
  if (!rule) return null;
  if (rule.interval === 1) {
    return FREQUENCY_LABELS[rule.frequency] || null;
  }
  const unitMap: Record<string, string> = {
    daily: 'dni',
    weekly: 'tyg.',
    monthly: 'mies.',
    yearly: 'lat',
  };
  return `Co ${rule.interval} ${unitMap[rule.frequency] || ''}`;
}
