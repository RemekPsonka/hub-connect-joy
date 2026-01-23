import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SectionJValueForCC } from '../types';

interface SectionJValueForCCProps {
  data: SectionJValueForCC;
  onChange: (data: SectionJValueForCC) => void;
}

export function SectionJValueForCCComponent({ data, onChange }: SectionJValueForCCProps) {
  const updateField = <K extends keyof SectionJValueForCC>(field: K, value: SectionJValueForCC[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Kontakty (jakie może wnieść)</Label>
        <Textarea
          value={data.kontakty || ''}
          onChange={(e) => updateField('kontakty', e.target.value)}
          placeholder="Jakie kontakty może wnieść do grupy..."
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Know-how</Label>
        <Textarea
          value={data.knowhow || ''}
          onChange={(e) => updateField('knowhow', e.target.value)}
          placeholder="Jaką wiedzę/doświadczenie może dzielić..."
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Zasoby</Label>
        <Textarea
          value={data.zasoby || ''}
          onChange={(e) => updateField('zasoby', e.target.value)}
          placeholder="Jakie zasoby może udostępnić (np. przestrzeń, narzędzia)..."
          className="min-h-[60px]"
        />
      </div>
    </div>
  );
}
