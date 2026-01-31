import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';
import { QuickAddPolicyButton } from '../QuickAddPolicyButton';
import type { RyzykoFlota, DomainProps } from '../types';

export function FleetDomain({ data, onChange, operationalTypes, companyId, onAddPolicy }: DomainProps<RyzykoFlota>) {
  const updateField = <K extends keyof RyzykoFlota>(field: K, value: RyzykoFlota[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-2 block">Status ubezpieczenia</Label>
          <InsuranceStatusToggle
            value={data.status}
            onChange={(status) => updateField('status', status)}
          />
        </div>
        
        {data.status === 'ubezpieczone' && companyId && onAddPolicy && (
          <QuickAddPolicyButton
            policyType="fleet"
            defaultPolicyName="Ubezpieczenie floty"
            defaultSumInsured={data.wartosc_floty}
            onAdd={(policyData) => onAddPolicy({
              ...policyData,
              policy_type: policyData.policy_type,
            })}
          />
        )}
      </div>

      {data.status !== 'nie_dotyczy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="liczba_pojazdow">Liczba pojazdów własnych</Label>
            <Input
              id="liczba_pojazdow"
              type="number"
              min={0}
              value={data.liczba_pojazdow || ''}
              onChange={(e) => updateField('liczba_pojazdow', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 15"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wartosc_floty">Wartość floty (PLN)</Label>
            <Input
              id="wartosc_floty"
              type="number"
              min={0}
              value={data.wartosc_floty || ''}
              onChange={(e) => updateField('wartosc_floty', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 2500000"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cargo_ubezpieczone"
              checked={data.cargo_ubezpieczone || false}
              onCheckedChange={(checked) => updateField('cargo_ubezpieczone', checked === true)}
            />
            <Label htmlFor="cargo_ubezpieczone" className="text-sm cursor-pointer">
              Cargo ubezpieczone
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cpm_ubezpieczone"
              checked={data.cpm_ubezpieczone || false}
              onCheckedChange={(checked) => updateField('cpm_ubezpieczone', checked === true)}
            />
            <Label htmlFor="cpm_ubezpieczone" className="text-sm cursor-pointer">
              CPM ubezpieczone
            </Label>
          </div>

          <div className="space-y-2 col-span-full">
            <Label htmlFor="uwagi_flota">Uwagi</Label>
            <Textarea
              id="uwagi_flota"
              value={data.uwagi || ''}
              onChange={(e) => updateField('uwagi', e.target.value)}
              placeholder="Dodatkowe informacje o flocie..."
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
