import { useState } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Landmark, X, Plus } from 'lucide-react';
import type { SectionMOrganizations } from '../types';

interface SectionMOrganizationsProps {
  data: SectionMOrganizations;
  onChange: (data: SectionMOrganizations) => void;
}

export function SectionMOrganizationsComponent({ data, onChange }: SectionMOrganizationsProps) {
  const [newFundacja, setNewFundacja] = useState('');
  const [newOrganizacja, setNewOrganizacja] = useState('');
  const [newIzba, setNewIzba] = useState('');
  const [newStowarzyszenie, setNewStowarzyszenie] = useState('');

  const updateField = <K extends keyof SectionMOrganizations>(field: K, value: SectionMOrganizations[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addItem = (
    field: 'fundacje_csr' | 'organizacje_branzowe' | 'izby_handlowe' | 'stowarzyszenia', 
    value: string, 
    setter: (v: string) => void
  ) => {
    if (value.trim()) {
      updateField(field, [...(data[field] || []), value.trim()]);
      setter('');
    }
  };

  const removeItem = (
    field: 'fundacje_csr' | 'organizacje_branzowe' | 'izby_handlowe' | 'stowarzyszenia', 
    index: number
  ) => {
    const updated = [...(data[field] || [])];
    updated.splice(index, 1);
    updateField(field, updated);
  };

  const renderTagField = (
    field: 'fundacje_csr' | 'organizacje_branzowe' | 'izby_handlowe' | 'stowarzyszenia',
    label: string,
    placeholder: string,
    newValue: string,
    setNewValue: (v: string) => void
  ) => (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {(data[field] || []).map((item, index) => (
          <Badge key={index} variant="outline" className="px-3 py-1.5">
            {item}
            <button onClick={() => removeItem(field, index)} className="ml-2 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem(field, newValue, setNewValue))}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => addItem(field, newValue, setNewValue)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <AccordionItem value="section-m">
      <AccordionTrigger className="text-base font-medium">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          M. Organizacje / fundacje
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-6">
        {renderTagField('fundacje_csr', 'Fundacje / CSR', 'Dodaj fundację...', newFundacja, setNewFundacja)}
        {renderTagField('organizacje_branzowe', 'Organizacje branżowe', 'Dodaj organizację...', newOrganizacja, setNewOrganizacja)}
        {renderTagField('izby_handlowe', 'Izby handlowe', 'Dodaj izbę...', newIzba, setNewIzba)}
        {renderTagField('stowarzyszenia', 'Stowarzyszenia', 'Dodaj stowarzyszenie...', newStowarzyszenie, setNewStowarzyszenie)}

        <div className="space-y-2">
          <Label>Inne członkostwa</Label>
          <Textarea
            value={data.inne || ''}
            onChange={(e) => updateField('inne', e.target.value)}
            placeholder="Inne organizacje, kluby, sieci..."
            className="min-h-[60px]"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
