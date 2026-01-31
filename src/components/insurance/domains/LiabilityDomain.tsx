import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';
import type { RyzykoOC, DomainProps } from '../types';

const TERYTORIA = ['Polska', 'UE', 'UK', 'USA', 'Kanada', 'Azja', 'Świat'];

export function LiabilityDomain({ data, onChange }: DomainProps<RyzykoOC>) {
  const updateField = <K extends keyof RyzykoOC>(field: K, value: RyzykoOC[K]) => {
    onChange({ ...data, [field]: value });
  };

  const toggleTerytorium = (terytorium: string) => {
    const current = data.zakres_terytorialny || [];
    if (current.includes(terytorium)) {
      updateField('zakres_terytorialny', current.filter((t) => t !== terytorium));
    } else {
      updateField('zakres_terytorialny', [...current, terytorium]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Status ubezpieczenia</Label>
        <InsuranceStatusToggle
          value={data.status}
          onChange={(status) => updateField('status', status)}
        />
      </div>

      {data.status !== 'nie_dotyczy' && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="oc_produktowe"
                checked={data.oc_produktowe || false}
                onCheckedChange={(checked) => updateField('oc_produktowe', checked === true)}
              />
              <Label htmlFor="oc_produktowe" className="text-sm cursor-pointer">
                OC produktowe
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="oc_zawodowe"
                checked={data.oc_zawodowe || false}
                onCheckedChange={(checked) => updateField('oc_zawodowe', checked === true)}
              />
              <Label htmlFor="oc_zawodowe" className="text-sm cursor-pointer">
                OC zawodowe
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Zakres terytorialny</Label>
            <div className="flex flex-wrap gap-2">
              {TERYTORIA.map((terytorium) => {
                const isSelected = (data.zakres_terytorialny || []).includes(terytorium);
                return (
                  <Badge
                    key={terytorium}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTerytorium(terytorium)}
                  >
                    {terytorium}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-center gap-2">
              <Checkbox
                id="jurysdykcja_usa"
                checked={data.jurysdykcja_usa || false}
                onCheckedChange={(checked) => updateField('jurysdykcja_usa', checked === true)}
              />
              <Label htmlFor="jurysdykcja_usa" className="text-sm cursor-pointer font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Jurysdykcja USA
              </Label>
            </div>
            
            {data.jurysdykcja_usa && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="obroty_usa" className="text-sm">Procent obrotów w USA</Label>
                <Input
                  id="obroty_usa"
                  type="number"
                  min={0}
                  max={100}
                  value={data.obroty_usa_procent || ''}
                  onChange={(e) => updateField('obroty_usa_procent', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="np. 15"
                  className="w-32"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="uwagi_oc">Uwagi</Label>
            <Textarea
              id="uwagi_oc"
              value={data.uwagi || ''}
              onChange={(e) => updateField('uwagi', e.target.value)}
              placeholder="Dodatkowe informacje o zakresie OC..."
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
