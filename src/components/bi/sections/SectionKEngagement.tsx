import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';
import type { SectionKEngagement } from '../types';

interface SectionKEngagementProps {
  data: SectionKEngagement;
  onChange: (data: SectionKEngagement) => void;
}

export function SectionKEngagementComponent({ data, onChange }: SectionKEngagementProps) {
  const updateField = <K extends keyof SectionKEngagement>(field: K, value: SectionKEngagement[K]) => {
    onChange({ ...data, [field]: value });
  };

  const engagementFields = [
    { key: 'mentoring', label: 'Mentoring' },
    { key: 'leadership', label: 'Leadership' },
    { key: 'edukacja', label: 'Edukacja' },
    { key: 'filantropia', label: 'Filantropia' },
    { key: 'integracja', label: 'Integracja' },
  ] as const;

  return (
    <AccordionItem value="section-k">
      <AccordionTrigger className="text-base font-medium">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          K. Zaangażowanie w CC
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-4">
        {engagementFields.map(({ key, label }) => (
          <div key={key} className="flex items-start gap-4 p-3 border rounded-lg">
            <div className="flex items-center space-x-2 min-w-[140px]">
              <Checkbox
                id={`engagement-${key}`}
                checked={data[key] || false}
                onCheckedChange={(checked) => updateField(key, checked === true)}
              />
              <Label htmlFor={`engagement-${key}`} className="cursor-pointer font-medium">
                {label}
              </Label>
            </div>
            
            {data[key] && (
              <Input
                value={data[`${key}_opis` as keyof SectionKEngagement] as string || ''}
                onChange={(e) => updateField(`${key}_opis` as keyof SectionKEngagement, e.target.value)}
                placeholder={`Szczegóły ${label.toLowerCase()}...`}
                className="flex-1"
              />
            )}
          </div>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}
