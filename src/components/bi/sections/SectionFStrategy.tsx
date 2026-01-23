import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SectionFStrategy } from '../types';

interface SectionFStrategyProps {
  data: SectionFStrategy;
  onChange: (data: SectionFStrategy) => void;
}

export function SectionFStrategyComponent({ data, onChange }: SectionFStrategyProps) {
  const updateField = <K extends keyof SectionFStrategy>(field: K, value: SectionFStrategy[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Cele strategiczne</Label>
        <Textarea
          value={data.cele_strategiczne || ''}
          onChange={(e) => updateField('cele_strategiczne', e.target.value)}
          placeholder="Jakie są główne cele strategiczne na najbliższe 2-3 lata..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Wpływ makro/trendów</Label>
        <Textarea
          value={data.wplyw_makro || ''}
          onChange={(e) => updateField('wplyw_makro', e.target.value)}
          placeholder="Jak trendy rynkowe, makroekonomia wpływają na biznes..."
          className="min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Szanse</Label>
          <Textarea
            value={data.szanse || ''}
            onChange={(e) => updateField('szanse', e.target.value)}
            placeholder="Jakie szanse widzi na rynku..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Ryzyka</Label>
          <Textarea
            value={data.ryzyka || ''}
            onChange={(e) => updateField('ryzyka', e.target.value)}
            placeholder="Jakie ryzyka identyfikuje..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}
