import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { SectionJValueForCC, SectionKEngagement } from '../types';

interface SmartSectionValueProps {
  valueData: SectionJValueForCC;
  engagementData: SectionKEngagement;
  onValueChange: (data: SectionJValueForCC) => void;
  onEngagementChange: (data: SectionKEngagement) => void;
}

export const VALUE_FIELDS = ['kontakty', 'knowhow', 'zasoby'];
export const ENGAGEMENT_FIELDS = ['mentoring', 'leadership', 'edukacja', 'filantropia', 'integracja'];

const ENGAGEMENT_ITEMS = [
  { key: 'mentoring', label: 'Mentoring' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'edukacja', label: 'Edukacja' },
  { key: 'filantropia', label: 'Filantropia' },
  { key: 'integracja', label: 'Integracja' },
] as const;

export function SmartSectionValueComponent({ valueData, engagementData, onValueChange, onEngagementChange }: SmartSectionValueProps) {
  const updateJ = <K extends keyof SectionJValueForCC>(f: K, v: SectionJValueForCC[K]) => onValueChange({ ...valueData, [f]: v });
  const updateK = <K extends keyof SectionKEngagement>(f: K, v: SectionKEngagement[K]) => onEngagementChange({ ...engagementData, [f]: v });

  return (
    <div className="space-y-6">
      {/* --- Wartość dla CC --- */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Wartość dla CC</Label>

        <div className="space-y-2">
          <Label>Kontakty (jakie może wnieść)</Label>
          <Textarea value={valueData.kontakty || ''} onChange={(e) => updateJ('kontakty', e.target.value)} placeholder="Jakie kontakty może wnieść do grupy..." className="min-h-[50px]" />
        </div>
        <div className="space-y-2">
          <Label>Know-how</Label>
          <Textarea value={valueData.knowhow || ''} onChange={(e) => updateJ('knowhow', e.target.value)} placeholder="Jaką wiedzę/doświadczenie może dzielić..." className="min-h-[50px]" />
        </div>
        <div className="space-y-2">
          <Label>Zasoby</Label>
          <Textarea value={valueData.zasoby || ''} onChange={(e) => updateJ('zasoby', e.target.value)} placeholder="Jakie zasoby może udostępnić..." className="min-h-[50px]" />
        </div>
      </div>

      {/* --- Zaangażowanie w CC --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Zaangażowanie w CC</Label>

        {ENGAGEMENT_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-start gap-4 p-3 border rounded-lg">
            <div className="flex items-center space-x-2 min-w-[140px]">
              <Checkbox
                id={`eng-smart-${key}`}
                checked={engagementData[key] || false}
                onCheckedChange={(c) => updateK(key, c === true)}
              />
              <Label htmlFor={`eng-smart-${key}`} className="cursor-pointer font-medium">{label}</Label>
            </div>
            {engagementData[key] && (
              <Input
                value={(engagementData[`${key}_opis` as keyof SectionKEngagement] as string) || ''}
                onChange={(e) => updateK(`${key}_opis` as keyof SectionKEngagement, e.target.value)}
                placeholder={`Szczegóły ${label.toLowerCase()}...`}
                className="flex-1"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
