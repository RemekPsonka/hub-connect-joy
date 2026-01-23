import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import type { SectionGNeeds } from '../types';
import { SEEKING_CATEGORIES } from '../types';

interface SectionGNeedsProps {
  data: SectionGNeeds;
  onChange: (data: SectionGNeeds) => void;
}

export function SectionGNeedsComponent({ data, onChange }: SectionGNeedsProps) {
  const [newPriority, setNewPriority] = useState('');

  const updateField = <K extends keyof SectionGNeeds>(field: K, value: SectionGNeeds[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addPriority = () => {
    if (newPriority.trim() && (!data.top3_priorytety || data.top3_priorytety.length < 3)) {
      updateField('top3_priorytety', [...(data.top3_priorytety || []), newPriority.trim()]);
      setNewPriority('');
    }
  };

  const removePriority = (index: number) => {
    const updated = [...(data.top3_priorytety || [])];
    updated.splice(index, 1);
    updateField('top3_priorytety', updated);
  };

  const toggleSeeking = (value: string) => {
    const current = data.czego_poszukuje || [];
    if (current.includes(value)) {
      updateField('czego_poszukuje', current.filter(v => v !== value));
    } else {
      updateField('czego_poszukuje', [...current, value]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 3 priorytety */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1">
          Top 3 priorytety
          <span className="text-destructive">*</span>
          <span className="text-xs text-muted-foreground ml-2">
            (lub wypełnij „Największe wyzwanie" poniżej)
          </span>
        </Label>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {(data.top3_priorytety || []).map((priority, index) => (
            <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm">
              {index + 1}. {priority}
              <button
                onClick={() => removePriority(index)}
                className="ml-2 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        
        {(!data.top3_priorytety || data.top3_priorytety.length < 3) && (
          <div className="flex gap-2">
            <Input
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              placeholder={`Priorytet ${(data.top3_priorytety?.length || 0) + 1}...`}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPriority())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addPriority}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Największe wyzwanie */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          Największe wyzwanie
          {(!data.top3_priorytety || data.top3_priorytety.length === 0) && (
            <span className="text-destructive">*</span>
          )}
        </Label>
        <Textarea
          value={data.najwieksze_wyzwanie || ''}
          onChange={(e) => updateField('najwieksze_wyzwanie', e.target.value)}
          placeholder="Opisz główne wyzwanie, z którym mierzy się klient..."
          className="min-h-[80px]"
        />
      </div>

      {/* Czego poszukuje - multi-select */}
      <div className="space-y-3">
        <Label>Czego poszukuje</Label>
        <div className="flex flex-wrap gap-2">
          {SEEKING_CATEGORIES.map((cat) => {
            const isSelected = (data.czego_poszukuje || []).includes(cat.value);
            return (
              <Badge
                key={cat.value}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => toggleSeeking(cat.value)}
              >
                {cat.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Jakich kontaktów potrzebuje */}
      <div className="space-y-2">
        <Label>Jakich kontaktów potrzebuje</Label>
        <Textarea
          value={data.jakich_kontaktow || ''}
          onChange={(e) => updateField('jakich_kontaktow', e.target.value)}
          placeholder="Opisz profile osób/firm, z którymi chciałby się połączyć..."
          className="min-h-[60px]"
        />
      </div>

      {/* Jakich rekomendacji */}
      <div className="space-y-2">
        <Label>Jakich rekomendacji oczekuje</Label>
        <Textarea
          value={data.jakich_rekomendacji || ''}
          onChange={(e) => updateField('jakich_rekomendacji', e.target.value)}
          placeholder="Jakiego typu wsparcia/rekomendacji szuka..."
          className="min-h-[60px]"
        />
      </div>

      {/* Grupa docelowa klientów */}
      <div className="space-y-2">
        <Label>Grupa docelowa klientów</Label>
        <Textarea
          value={data.grupa_docelowa || ''}
          onChange={(e) => updateField('grupa_docelowa', e.target.value)}
          placeholder="Opisz idealny profil klienta..."
          className="min-h-[60px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Horyzont czasowy */}
        <div className="space-y-2">
          <Label>Horyzont czasowy</Label>
          <Select
            value={data.horyzont_czasowy || ''}
            onValueChange={(value) => updateField('horyzont_czasowy', value as SectionGNeeds['horyzont_czasowy'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-6">0-6 miesięcy</SelectItem>
              <SelectItem value="6-18">6-18 miesięcy</SelectItem>
              <SelectItem value="18+">18+ miesięcy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priorytet */}
        <div className="space-y-2">
          <Label>Priorytet potrzeb</Label>
          <Select
            value={data.priorytet || ''}
            onValueChange={(value) => updateField('priorytet', value as SectionGNeeds['priorytet'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="niski">Niski</SelectItem>
              <SelectItem value="sredni">Średni</SelectItem>
              <SelectItem value="wysoki">Wysoki</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
