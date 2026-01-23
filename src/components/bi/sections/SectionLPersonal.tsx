import { useState } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, X, Plus } from 'lucide-react';
import type { SectionLPersonal } from '../types';

interface SectionLPersonalProps {
  data: SectionLPersonal;
  onChange: (data: SectionLPersonal) => void;
}

export function SectionLPersonalComponent({ data, onChange }: SectionLPersonalProps) {
  const [newLokalizacja, setNewLokalizacja] = useState('');
  const [newHobby, setNewHobby] = useState('');

  const updateField = <K extends keyof SectionLPersonal>(field: K, value: SectionLPersonal[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addItem = (field: 'czeste_lokalizacje' | 'hobby', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      updateField(field, [...(data[field] || []), value.trim()]);
      setter('');
    }
  };

  const removeItem = (field: 'czeste_lokalizacje' | 'hobby', index: number) => {
    const updated = [...(data[field] || [])];
    updated.splice(index, 1);
    updateField(field, updated);
  };

  return (
    <AccordionItem value="section-l">
      <AccordionTrigger className="text-base font-medium">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          L. Prywatne
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Miasto bazowe</Label>
            <Input
              value={data.miasto_bazowe || ''}
              onChange={(e) => updateField('miasto_bazowe', e.target.value)}
              placeholder="np. Warszawa"
            />
          </div>
        </div>

        {/* Częste lokalizacje */}
        <div className="space-y-3">
          <Label>Częste lokalizacje</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.czeste_lokalizacje || []).map((lok, index) => (
              <Badge key={index} variant="outline" className="px-3 py-1.5">
                {lok}
                <button onClick={() => removeItem('czeste_lokalizacje', index)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newLokalizacja}
              onChange={(e) => setNewLokalizacja(e.target.value)}
              placeholder="Dodaj lokalizację..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('czeste_lokalizacje', newLokalizacja, setNewLokalizacja))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addItem('czeste_lokalizacje', newLokalizacja, setNewLokalizacja)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hobby/pasje */}
        <div className="space-y-3">
          <Label>Hobby / Pasje</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.hobby || []).map((h, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1.5">
                {h}
                <button onClick={() => removeItem('hobby', index)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newHobby}
              onChange={(e) => setNewHobby(e.target.value)}
              placeholder="Dodaj hobby..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('hobby', newHobby, setNewHobby))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addItem('hobby', newHobby, setNewHobby)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cele prywatne 2-3 lata</Label>
          <Textarea
            value={data.cele_prywatne || ''}
            onChange={(e) => updateField('cele_prywatne', e.target.value)}
            placeholder="Jakie ma cele prywatne na najbliższe lata..."
            className="min-h-[60px]"
          />
        </div>

        <div className="flex items-start gap-4 p-3 border rounded-lg">
          <div className="flex items-center space-x-2 min-w-[120px]">
            <Checkbox
              id="sukcesja"
              checked={data.sukcesja || false}
              onCheckedChange={(checked) => updateField('sukcesja', checked === true)}
            />
            <Label htmlFor="sukcesja" className="cursor-pointer font-medium">
              Sukcesja
            </Label>
          </div>
          
          {data.sukcesja && (
            <Input
              value={data.sukcesja_opis || ''}
              onChange={(e) => updateField('sukcesja_opis', e.target.value)}
              placeholder="Plany sukcesji..."
              className="flex-1"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>Zasady życiowe (opcjonalnie)</Label>
          <Textarea
            value={data.zasady || ''}
            onChange={(e) => updateField('zasady', e.target.value)}
            placeholder="Wartości, zasady którymi się kieruje..."
            className="min-h-[60px]"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
