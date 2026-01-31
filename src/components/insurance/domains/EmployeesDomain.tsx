import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Heart, Stethoscope, Plane } from 'lucide-react';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';
import { QuickAddPolicyButton } from '../QuickAddPolicyButton';
import type { RyzykoPracownicy, DomainProps } from '../types';

export function EmployeesDomain({ data, onChange, operationalTypes, companyId, onAddPolicy }: DomainProps<RyzykoPracownicy>) {
  const updateField = <K extends keyof RyzykoPracownicy>(field: K, value: RyzykoPracownicy[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Życie */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-muted-foreground" />
            Ubezpieczenie na życie
          </div>
          {data.zycie_status === 'ubezpieczone' && companyId && onAddPolicy && (
            <QuickAddPolicyButton
              policyType="life"
              defaultPolicyName="Ubezpieczenie grupowe na życie"
              onAdd={(policyData) => onAddPolicy({
                ...policyData,
                policy_type: policyData.policy_type,
              })}
            />
          )}
        </div>
        <InsuranceStatusToggle
          value={data.zycie_status}
          onChange={(status) => updateField('zycie_status', status)}
        />
        {data.zycie_status !== 'nie_dotyczy' && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="zycie_pracownicy">Liczba ubezpieczonych pracowników</Label>
            <Input
              id="zycie_pracownicy"
              type="number"
              min={0}
              value={data.zycie_liczba_pracownikow || ''}
              onChange={(e) => updateField('zycie_liczba_pracownikow', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 450"
            />
          </div>
        )}
      </div>

      {/* Zdrowie */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            Ubezpieczenie zdrowotne
          </div>
          {data.zdrowie_status === 'ubezpieczone' && companyId && onAddPolicy && (
            <QuickAddPolicyButton
              policyType="health"
              defaultPolicyName="Ubezpieczenie zdrowotne grupowe"
              onAdd={(policyData) => onAddPolicy({
                ...policyData,
                policy_type: policyData.policy_type,
              })}
            />
          )}
        </div>
        <InsuranceStatusToggle
          value={data.zdrowie_status}
          onChange={(status) => updateField('zdrowie_status', status)}
        />
        {data.zdrowie_status !== 'nie_dotyczy' && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="zdrowie_pakiet">Typ pakietu</Label>
            <Input
              id="zdrowie_pakiet"
              value={data.zdrowie_typ_pakietu || ''}
              onChange={(e) => updateField('zdrowie_typ_pakietu', e.target.value)}
              placeholder="np. Pakiet Premium, Medicover, LuxMed..."
            />
          </div>
        )}
      </div>

      {/* Podróże */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plane className="h-4 w-4 text-muted-foreground" />
            Ubezpieczenie podróży służbowych
          </div>
          {data.podroze_status === 'ubezpieczone' && companyId && onAddPolicy && (
            <QuickAddPolicyButton
              policyType="other"
              defaultPolicyName="Ubezpieczenie podróży służbowych"
              onAdd={(policyData) => onAddPolicy({
                ...policyData,
                policy_type: policyData.policy_type,
              })}
            />
          )}
        </div>
        <InsuranceStatusToggle
          value={data.podroze_status}
          onChange={(status) => updateField('podroze_status', status)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="uwagi_pracownicy">Uwagi ogólne</Label>
        <Textarea
          id="uwagi_pracownicy"
          value={data.uwagi || ''}
          onChange={(e) => updateField('uwagi', e.target.value)}
          placeholder="Dodatkowe informacje o ubezpieczeniach pracowniczych..."
          rows={2}
        />
      </div>
    </div>
  );
}
