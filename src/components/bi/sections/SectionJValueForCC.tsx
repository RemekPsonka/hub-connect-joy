import { useState } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gem, X, Plus } from 'lucide-react';
import type { SectionJValueForCC } from '../types';

interface SectionJValueForCCProps {
  data: SectionJValueForCC;
  onChange: (data: SectionJValueForCC) => void;
}

export function SectionJValueForCCComponent({ data, onChange }: SectionJValueForCCProps) {
  const [newExpertise, setNewExpertise] = useState('');
  const [newBranza, setNewBranza] = useState('');

  const updateField = <K extends keyof SectionJValueForCC>(field: K, value: SectionJValueForCC[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addItem = (field: 'ekspertyzy' | 'branze_wsparcia', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      updateField(field, [...(data[field] || []), value.trim()]);
      setter('');
    }
  };

  const removeItem = (field: 'ekspertyzy' | 'branze_wsparcia', index: number) => {
    const updated = [...(data[field] || [])];
    updated.splice(index, 1);
    updateField(field, updated);
  };

  return (
    <AccordionItem value="section-j">
      <AccordionTrigger className="text-base font-medium">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-primary" />
          J. Wartość dla CC
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-6">
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

        {/* Ekspertyzy */}
        <div className="space-y-3">
          <Label>Ekspertyzy</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.ekspertyzy || []).map((exp, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1.5">
                {exp}
                <button onClick={() => removeItem('ekspertyzy', index)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newExpertise}
              onChange={(e) => setNewExpertise(e.target.value)}
              placeholder="Dodaj ekspertyzę..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('ekspertyzy', newExpertise, setNewExpertise))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addItem('ekspertyzy', newExpertise, setNewExpertise)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Branże wsparcia */}
        <div className="space-y-3">
          <Label>Branże, w których może wspierać</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.branze_wsparcia || []).map((branza, index) => (
              <Badge key={index} variant="outline" className="px-3 py-1.5">
                {branza}
                <button onClick={() => removeItem('branze_wsparcia', index)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBranza}
              onChange={(e) => setNewBranza(e.target.value)}
              placeholder="Dodaj branżę..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('branze_wsparcia', newBranza, setNewBranza))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addItem('branze_wsparcia', newBranza, setNewBranza)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Role w grupie (jakie może pełnić)</Label>
          <Textarea
            value={data.role_w_grupie || ''}
            onChange={(e) => updateField('role_w_grupie', e.target.value)}
            placeholder="Jakie role mógłby pełnić w CC..."
            className="min-h-[60px]"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
