import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lock, Users, HardHat } from 'lucide-react';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';
import { QuickAddPolicyButton } from '../QuickAddPolicyButton';
import type { RyzykoSpecjalistyczne, DomainProps } from '../types';

export function SpecialtyDomain({ data, onChange, operationalTypes, companyId, onAddPolicy }: DomainProps<RyzykoSpecjalistyczne>) {
  const updateField = <K extends keyof RyzykoSpecjalistyczne>(field: K, value: RyzykoSpecjalistyczne[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Cyber */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Cyber
          </div>
          {data.cyber_status === 'ubezpieczone' && companyId && onAddPolicy && (
            <QuickAddPolicyButton
              policyType="cyber"
              defaultPolicyName="Ubezpieczenie Cyber"
              defaultSumInsured={data.cyber_suma}
              onAdd={(policyData) => onAddPolicy({
                ...policyData,
                policy_type: policyData.policy_type,
              })}
            />
          )}
        </div>
        <InsuranceStatusToggle
          value={data.cyber_status}
          onChange={(status) => updateField('cyber_status', status)}
        />
        {data.cyber_status !== 'nie_dotyczy' && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="cyber_suma">Suma ubezpieczenia Cyber (PLN)</Label>
            <Input
              id="cyber_suma"
              type="number"
              min={0}
              value={data.cyber_suma || ''}
              onChange={(e) => updateField('cyber_suma', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 5000000"
            />
          </div>
        )}
      </div>

      {/* D&O */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            D&O (Członkowie Zarządu)
          </div>
          {data.do_status === 'ubezpieczone' && companyId && onAddPolicy && (
            <QuickAddPolicyButton
              policyType="do"
              defaultPolicyName="Ubezpieczenie D&O"
              defaultSumInsured={data.do_suma}
              onAdd={(policyData) => onAddPolicy({
                ...policyData,
                policy_type: policyData.policy_type,
              })}
            />
          )}
        </div>
        <InsuranceStatusToggle
          value={data.do_status}
          onChange={(status) => updateField('do_status', status)}
        />
        {data.do_status !== 'nie_dotyczy' && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="do_suma">Suma ubezpieczenia D&O (PLN)</Label>
            <Input
              id="do_suma"
              type="number"
              min={0}
              value={data.do_suma || ''}
              onChange={(e) => updateField('do_suma', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 10000000"
            />
          </div>
        )}
      </div>

      {/* CAR/EAR */}
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HardHat className="h-4 w-4 text-muted-foreground" />
            CAR/EAR (Budowa/Montaż)
          </div>
          {data.car_ear_status === 'ubezpieczone' && companyId && onAddPolicy && (
            <QuickAddPolicyButton
              policyType="other"
              defaultPolicyName="Ubezpieczenie CAR/EAR"
              onAdd={(policyData) => onAddPolicy({
                ...policyData,
                policy_type: policyData.policy_type,
              })}
            />
          )}
        </div>
        <InsuranceStatusToggle
          value={data.car_ear_status}
          onChange={(status) => updateField('car_ear_status', status)}
        />
        {data.car_ear_status !== 'nie_dotyczy' && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="car_ear_projekty">Opis projektów</Label>
            <Textarea
              id="car_ear_projekty"
              value={data.car_ear_projekty || ''}
              onChange={(e) => updateField('car_ear_projekty', e.target.value)}
              placeholder="Opis aktualnych lub planowanych projektów budowlanych..."
              rows={2}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="uwagi_specjalistyczne">Uwagi ogólne</Label>
        <Textarea
          id="uwagi_specjalistyczne"
          value={data.uwagi || ''}
          onChange={(e) => updateField('uwagi', e.target.value)}
          placeholder="Dodatkowe informacje o ryzykach specjalistycznych..."
          rows={2}
        />
      </div>
    </div>
  );
}
