import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import type { SectionABasic } from '../types';

interface SmartSectionContextProps {
  data: SectionABasic;
  onChange: (data: SectionABasic) => void;
}

export const CONTEXT_FIELDS = [
  'podpowiedzi_brief', 'status_relacji', 'sila_relacji', 'rozważa_aplikacje_cc',
  'zrodlo_kontaktu', 'firma_nieznana',
];

export function SmartSectionContextComponent({ data, onChange }: SmartSectionContextProps) {
  const updateField = <K extends keyof SectionABasic>(field: K, value: SectionABasic[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Brief / podpowiedzi */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Podpowiedzi z BRIEF
        </Label>
        <Textarea
          value={data.podpowiedzi_brief || ''}
          onChange={(e) => updateField('podpowiedzi_brief', e.target.value)}
          placeholder="Notatki / podpowiedzi przygotowane przed spotkaniem..."
          className="min-h-[70px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status relacji */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Status relacji
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={data.status_relacji || ''}
            onValueChange={(value) => updateField('status_relacji', value as SectionABasic['status_relacji'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nowy">Nowy kontakt</SelectItem>
              <SelectItem value="polecony">Polecony</SelectItem>
              <SelectItem value="powracajacy">Powracający</SelectItem>
              <SelectItem value="znajomy">Znajomy</SelectItem>
              <SelectItem value="klient">Klient</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Siła relacji */}
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <span>Siła relacji</span>
            <span className="text-sm font-medium text-primary">{data.sila_relacji || 5}/10</span>
          </Label>
          <Slider
            value={[data.sila_relacji || 5]}
            onValueChange={([value]) => updateField('sila_relacji', value)}
            min={1}
            max={10}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Słaba</span>
            <span>Silna</span>
          </div>
        </div>

        {/* Rozważa aplikację do CC */}
        <div className="space-y-2">
          <Label>Rozważa aplikację do CC?</Label>
          <Select
            value={data.rozważa_aplikacje_cc || ''}
            onValueChange={(value) => updateField('rozważa_aplikacje_cc', value as SectionABasic['rozważa_aplikacje_cc'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tak">Tak</SelectItem>
              <SelectItem value="nie">Nie</SelectItem>
              <SelectItem value="nie_wiem">Nie wiem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Źródło kontaktu */}
      <div className="space-y-2">
        <Label>Źródło kontaktu</Label>
        <Input
          value={data.zrodlo_kontaktu || ''}
          onChange={(e) => updateField('zrodlo_kontaktu', e.target.value)}
          placeholder="np. Polecenie, LinkedIn, Konferencja"
        />
      </div>

      {/* Firma nieznana */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="firma-nieznana-smart"
          checked={data.firma_nieznana || false}
          onCheckedChange={(checked) => updateField('firma_nieznana', checked === true)}
        />
        <Label htmlFor="firma-nieznana-smart" className="text-sm text-muted-foreground cursor-pointer">
          Firma nieznana na tym etapie
        </Label>
      </div>
    </div>
  );
}
