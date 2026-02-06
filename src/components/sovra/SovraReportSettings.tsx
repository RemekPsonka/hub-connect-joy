import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Sparkles, Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  useReportConfig,
  useSaveReportConfig,
  usePreviewReport,
  type SovraReportConfig,
} from '@/hooks/useSovraReportConfig';
import { ReportPreviewModal } from './ReportPreviewModal';

const DAYS_OF_WEEK = [
  { value: '1', label: 'Poniedziałek' },
  { value: '2', label: 'Wtorek' },
  { value: '3', label: 'Środa' },
  { value: '4', label: 'Czwartek' },
  { value: '5', label: 'Piątek' },
  { value: '6', label: 'Sobota' },
  { value: '0', label: 'Niedziela' },
];

const SECTIONS: ReadonlyArray<{ key: string; label: string; locked?: boolean }> = [
  { key: 'summary', label: 'Podsumowanie AI', locked: true },
  { key: 'tasks', label: 'Zadania' },
  { key: 'projects', label: 'Projekty' },
  { key: 'contacts', label: 'Kontakty' },
  { key: 'calendar', label: 'Kalendarz' },
];

export function SovraReportSettings() {
  const { director } = useAuth();
  const { data: config, isLoading } = useReportConfig();
  const saveConfig = useSaveReportConfig();
  const previewReport = usePreviewReport();

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Local form state
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [emailOverride, setEmailOverride] = useState('');
  const [includeSections, setIncludeSections] = useState<string[]>([
    'summary', 'tasks', 'projects', 'contacts', 'calendar',
  ]);

  // Sync from server config
  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setFrequency(config.frequency);
      setDayOfWeek(config.day_of_week);
      setTimeOfDay(config.time_of_day);
      setEmailOverride(config.email_override || '');
      setIncludeSections(config.include_sections);
    }
  }, [config]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!config && checked) {
      // First enable — save default config immediately
      saveConfig.mutate({ enabled: true });
    } else if (config) {
      saveConfig.mutate({ ...buildPayload(), enabled: checked });
    }
  };

  const buildPayload = (): Partial<SovraReportConfig> => ({
    enabled,
    frequency,
    day_of_week: dayOfWeek,
    time_of_day: timeOfDay,
    email_override: emailOverride || null,
    include_sections: includeSections,
  });

  const handleSave = () => {
    saveConfig.mutate(buildPayload());
  };

  const handlePreview = async () => {
    const result = await previewReport.mutateAsync();
    if (result?.preview_html) {
      setPreviewHtml(result.preview_html);
    }
  };

  const toggleSection = (key: string) => {
    setIncludeSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Raporty Sovry
              </CardTitle>
              <CardDescription className="mt-1">
                Automatyczne raporty email z podsumowaniem Twojej aktywności
              </CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} />
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-6">
            {/* Frequency */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Częstotliwość</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFrequency('weekly')}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    frequency === 'weekly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <p className="text-sm font-medium">Tygodniowo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Raport co tydzień w wybrany dzień
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('daily')}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    frequency === 'daily'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <p className="text-sm font-medium">Codziennie</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Raport każdego dnia rano
                  </p>
                </button>
              </div>
            </div>

            {/* Day of week (only weekly) */}
            {frequency === 'weekly' && (
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Dzień tygodnia</Label>
                <Select
                  value={String(dayOfWeek)}
                  onValueChange={(v) => setDayOfWeek(Number(v))}
                >
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="timeOfDay">Godzina wysyłki</Label>
              <Input
                id="timeOfDay"
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-40"
              />
              <p className="text-xs text-muted-foreground">
                Raport będzie wysyłany około tej godziny
              </p>
            </div>

            {/* Email override */}
            <div className="space-y-2">
              <Label htmlFor="emailOverride">Email odbiorcy</Label>
              <Input
                id="emailOverride"
                type="email"
                placeholder={director?.email || 'twoj@email.com'}
                value={emailOverride}
                onChange={(e) => setEmailOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Domyślnie na Twój email. Wpisz inny jeśli chcesz wysyłać gdzie indziej.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              <Label>Sekcje w raporcie</Label>
              <div className="space-y-2">
                {SECTIONS.map((section) => (
                  <div key={section.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`section-${section.key}`}
                      checked={includeSections.includes(section.key)}
                      onCheckedChange={() => {
                        if (!section.locked) toggleSection(section.key);
                      }}
                      disabled={section.locked}
                    />
                    <Label
                      htmlFor={`section-${section.key}`}
                      className={`text-sm ${section.locked ? 'text-muted-foreground' : ''}`}
                    >
                      {section.label}
                      {section.locked && (
                        <span className="text-xs text-muted-foreground ml-1">(zawsze włączone)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Last sent */}
            {config?.last_sent_at && (
              <p className="text-xs text-muted-foreground">
                Ostatni raport:{' '}
                {format(new Date(config.last_sent_at), "d MMM yyyy, HH:mm", { locale: pl })}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saveConfig.isPending}>
                {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Zapisz
              </Button>
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewReport.isPending}
              >
                {previewReport.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Podgląd raportu
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <ReportPreviewModal
        open={!!previewHtml}
        onOpenChange={(open) => {
          if (!open) setPreviewHtml(null);
        }}
        html={previewHtml || ''}
      />
    </>
  );
}
