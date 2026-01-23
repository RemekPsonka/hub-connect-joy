import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import type { SectionDScale } from '../types';
import { REVENUE_PRESETS } from '../types';

interface SectionDScaleProps {
  data: SectionDScale;
  onChange: (data: SectionDScale) => void;
}

export function SectionDScaleComponent({ data, onChange }: SectionDScaleProps) {
  const [newBranza, setNewBranza] = useState('');
  const [newKraj, setNewKraj] = useState('');

  const updateField = <K extends keyof SectionDScale>(field: K, value: SectionDScale[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addItem = (field: 'inne_branze' | 'kraje_dzialalnosci', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      updateField(field, [...(data[field] || []), value.trim()]);
      setter('');
    }
  };

  const removeItem = (field: 'inne_branze' | 'kraje_dzialalnosci', index: number) => {
    const updated = [...(data[field] || [])];
    updated.splice(index, 1);
    updateField(field, updated);
  };

  return (
    <div className="space-y-6">
      {/* Skala grupy */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Skala grupy</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Przychody ostatni rok */}
          <div className="space-y-2">
            <Label>Przychody ostatni rok</Label>
            <Select
              value={data.przychody_ostatni_rok || ''}
              onValueChange={(value) => updateField('przychody_ostatni_rok', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz przedział" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Przychody plan */}
          <div className="space-y-2">
            <Label>Przychody plan (ten rok)</Label>
            <Select
              value={data.przychody_plan || ''}
              onValueChange={(value) => updateField('przychody_plan', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz przedział" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* EBITDA ostatni rok */}
          <div className="space-y-2">
            <Label>EBITDA ostatni rok</Label>
            <Input
              value={data.ebitda_ostatni || ''}
              onChange={(e) => updateField('ebitda_ostatni', e.target.value)}
              placeholder="np. 5 mln PLN lub 15%"
            />
          </div>

          {/* EBITDA plan */}
          <div className="space-y-2">
            <Label>EBITDA plan</Label>
            <Input
              value={data.ebitda_plan || ''}
              onChange={(e) => updateField('ebitda_plan', e.target.value)}
              placeholder="np. 7 mln PLN lub 18%"
            />
          </div>

          {/* Pracownicy */}
          <div className="space-y-2">
            <Label>Pracownicy</Label>
            <Input
              value={data.pracownicy || ''}
              onChange={(e) => updateField('pracownicy', e.target.value)}
              placeholder="np. 50-100 lub 250"
            />
          </div>

          {/* Pojazdy */}
          <div className="space-y-2">
            <Label>Pojazdy (flota)</Label>
            <Input
              type="number"
              value={data.pojazdy || ''}
              onChange={(e) => updateField('pojazdy', parseInt(e.target.value) || 0)}
              placeholder="Liczba pojazdów"
            />
          </div>

          {/* Liczba spółek */}
          <div className="space-y-2">
            <Label>Liczba spółek w grupie</Label>
            <Input
              type="number"
              value={data.liczba_spolek || ''}
              onChange={(e) => updateField('liczba_spolek', parseInt(e.target.value) || 0)}
              placeholder="np. 3"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="glowna-holding"
            checked={data.glowna_vs_holding || false}
            onCheckedChange={(checked) => updateField('glowna_vs_holding', checked === true)}
          />
          <Label htmlFor="glowna-holding" className="cursor-pointer">
            Jest to holding (nie główna spółka operacyjna)
          </Label>
        </div>
      </div>

      {/* Pozostałe biznesy właściciela */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Pozostałe biznesy właściciela</Label>
        
        {/* Inne branże */}
        <div className="space-y-3">
          <Label>Inne branże</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.inne_branze || []).map((branza, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1.5">
                {branza}
                <button onClick={() => removeItem('inne_branze', index)} className="ml-2 hover:text-destructive">
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
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('inne_branze', newBranza, setNewBranza))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addItem('inne_branze', newBranza, setNewBranza)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Skala w Polsce</Label>
            <Input
              value={data.skala_pl || ''}
              onChange={(e) => updateField('skala_pl', e.target.value)}
              placeholder="np. regionalna, ogólnopolska"
            />
          </div>

          <div className="space-y-2">
            <Label>Skala za granicą</Label>
            <Input
              value={data.skala_zagranica || ''}
              onChange={(e) => updateField('skala_zagranica', e.target.value)}
              placeholder="np. Europa, globalnie"
            />
          </div>
        </div>

        {/* Kraje działalności */}
        <div className="space-y-3">
          <Label>Kraje działalności</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.kraje_dzialalnosci || []).map((kraj, index) => (
              <Badge key={index} variant="outline" className="px-3 py-1.5">
                {kraj}
                <button onClick={() => removeItem('kraje_dzialalnosci', index)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newKraj}
              onChange={(e) => setNewKraj(e.target.value)}
              placeholder="Dodaj kraj..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('kraje_dzialalnosci', newKraj, setNewKraj))}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addItem('kraje_dzialalnosci', newKraj, setNewKraj)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
