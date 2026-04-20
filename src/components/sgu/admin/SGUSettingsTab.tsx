import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSGUSettings, useUpdateSGUSettings } from '@/hooks/useSGUSettings';
import { useAuth } from '@/contexts/AuthContext';

export function SGUSettingsTab() {
  const { data: settings, isLoading } = useSGUSettings();
  const update = useUpdateSGUSettings();
  const { director } = useAuth();
  const isDirector = !!director;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!settings || !settings.tenant_id) {
    return <Alert><AlertDescription>Brak skonfigurowanych ustawień SGU.</AlertDescription></Alert>;
  }

  const tenantId = settings.tenant_id;

  const handleToggle = (key: 'enable_sgu_layout' | 'enable_sgu_prospecting_ai' | 'enable_sgu_reports', value: boolean) => {
    update.mutate({ tenant_id: tenantId, [key]: value });
  };

  const rows: Array<{
    key: 'enable_sgu_layout' | 'enable_sgu_prospecting_ai' | 'enable_sgu_reports';
    label: string;
    desc: string;
    directorOnly?: boolean;
  }> = [
    { key: 'enable_sgu_layout', label: 'Layout SGU', desc: 'Włącza dedykowany layout modułu SGU.', directorOnly: true },
    { key: 'enable_sgu_prospecting_ai', label: 'Prospecting AI', desc: 'Funkcje AI w prospectingu (SGU-08).' },
    { key: 'enable_sgu_reports', label: 'Raporty SGU', desc: 'Moduł raportów SGU (SGU-09).' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Ustawienia SGU</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => {
          const disabled = update.isPending || (r.directorOnly && !isDirector);
          return (
            <div key={r.key} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor={r.key} className="font-medium">{r.label}</Label>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Switch
                id={r.key}
                checked={!!settings[r.key]}
                disabled={disabled}
                onCheckedChange={(v) => handleToggle(r.key, v)}
              />
            </div>
          );
        })}
        {!isDirector && (
          <p className="text-xs text-muted-foreground italic">
            Niektóre ustawienia może zmieniać tylko dyrektor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
