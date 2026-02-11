import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Sparkles } from 'lucide-react';
import type { SectionCCompanyProfile, SectionDScale } from '../types';
import { REVENUE_PRESETS } from '../types';

interface SmartSectionCompanyProps {
  companyData: SectionCCompanyProfile;
  scaleData: SectionDScale;
  onCompanyChange: (data: SectionCCompanyProfile) => void;
  onScaleChange: (data: SectionDScale) => void;
}

export const COMPANY_FIELDS = [
  'zakres_dzialalnosci', 'rynki', 'produkty_uslugi', 'wartosc_dla_klientow', 'powod_dumy',
  'tytul_rola', 'ceo_operacyjny', 'procent_udzialow', 'wspolnicy', 'inwestor_finansowy',
];

export const SCALE_FIELDS = [
  'przychody_ostatni_rok', 'przychody_plan', 'ebitda_ostatni', 'ebitda_plan',
  'pracownicy', 'liczba_spolek', 'inne_branze', 'kraje_dzialalnosci',
];

export function SmartSectionCompanyComponent({ companyData, scaleData, onCompanyChange, onScaleChange }: SmartSectionCompanyProps) {
  const [newProduct, setNewProduct] = useState('');
  const [newBranza, setNewBranza] = useState('');
  const [newKraj, setNewKraj] = useState('');

  const updateC = <K extends keyof SectionCCompanyProfile>(field: K, value: SectionCCompanyProfile[K]) => {
    onCompanyChange({ ...companyData, [field]: value });
  };

  const updateD = <K extends keyof SectionDScale>(field: K, value: SectionDScale[K]) => {
    onScaleChange({ ...scaleData, [field]: value });
  };

  const addTag = (arr: string[] | undefined, value: string) => [...(arr || []), value.trim()];
  const removeTag = (arr: string[] | undefined, idx: number) => {
    const u = [...(arr || [])];
    u.splice(idx, 1);
    return u;
  };

  return (
    <div className="space-y-6">
      {/* --- Profil działalności --- */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Profil działalności</Label>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Zakres działalności
          </Label>
          <Textarea
            value={companyData.zakres_dzialalnosci || ''}
            onChange={(e) => updateC('zakres_dzialalnosci', e.target.value)}
            placeholder="Czym zajmuje się firma..."
            className="min-h-[70px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rynki</Label>
            <Input value={companyData.rynki || ''} onChange={(e) => updateC('rynki', e.target.value)} placeholder="np. Polska, Europa" />
          </div>
          <div className="space-y-2">
            <Label>Wartość dla klientów</Label>
            <Input value={companyData.wartosc_dla_klientow || ''} onChange={(e) => updateC('wartosc_dla_klientow', e.target.value)} placeholder="Jak pomaga klientom..." />
          </div>
        </div>

        {/* Produkty/usługi */}
        <div className="space-y-2">
          <Label>Produkty / usługi</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(companyData.produkty_uslugi || []).map((p, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1">
                {p}
                <button onClick={() => updateC('produkty_uslugi', removeTag(companyData.produkty_uslugi, i))} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="Dodaj..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newProduct.trim()) { updateC('produkty_uslugi', addTag(companyData.produkty_uslugi, newProduct)); setNewProduct(''); } } }} />
            <Button type="button" variant="outline" size="icon" onClick={() => { if (newProduct.trim()) { updateC('produkty_uslugi', addTag(companyData.produkty_uslugi, newProduct)); setNewProduct(''); } }}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Powód dumy</Label>
          <Textarea value={companyData.powod_dumy || ''} onChange={(e) => updateC('powod_dumy', e.target.value)} placeholder="Z czego jest dumny jako przedsiębiorca..." className="min-h-[50px]" />
        </div>
      </div>

      {/* --- Rola w firmie --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Rola w firmie</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tytuł / Stanowisko</Label>
            <Input value={companyData.tytul_rola || ''} onChange={(e) => updateC('tytul_rola', e.target.value)} placeholder="np. CEO, Prezes" />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox id="ceo-op-smart" checked={companyData.ceo_operacyjny || false} onCheckedChange={(c) => updateC('ceo_operacyjny', c === true)} />
            <Label htmlFor="ceo-op-smart" className="cursor-pointer">CEO operacyjny</Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Poziom decyzyjności (1-5)</Label>
          <div className="flex items-center gap-4">
            <Slider value={[companyData.poziom_decyzyjnosci || 3]} onValueChange={([v]) => updateC('poziom_decyzyjnosci', v)} min={1} max={5} step={1} className="flex-1" />
            <Badge variant="outline" className="min-w-[3rem] justify-center">{companyData.poziom_decyzyjnosci || 3}/5</Badge>
          </div>
        </div>
      </div>

      {/* --- Własność --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Struktura własności</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>% udziałów</Label>
            <Input type="number" min={0} max={100} value={companyData.procent_udzialow || ''} onChange={(e) => updateC('procent_udzialow', parseFloat(e.target.value) || 0)} placeholder="np. 51" />
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox id="wspolnicy-smart" checked={companyData.wspolnicy || false} onCheckedChange={(c) => updateC('wspolnicy', c === true)} />
            <Label htmlFor="wspolnicy-smart" className="cursor-pointer">Ma wspólników</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="inv-smart" checked={companyData.inwestor_finansowy || false} onCheckedChange={(c) => updateC('inwestor_finansowy', c === true)} />
            <Label htmlFor="inv-smart" className="cursor-pointer">Inwestor finansowy (PE/VC)</Label>
          </div>
        </div>
      </div>

      {/* --- Skala --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Skala działalności
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Przychody ostatni rok</Label>
            <Select value={scaleData.przychody_ostatni_rok || ''} onValueChange={(v) => updateD('przychody_ostatni_rok', v)}>
              <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
              <SelectContent>{REVENUE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Przychody plan</Label>
            <Select value={scaleData.przychody_plan || ''} onValueChange={(v) => updateD('przychody_plan', v)}>
              <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
              <SelectContent>{REVENUE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>EBITDA ostatni rok</Label>
            <Input value={scaleData.ebitda_ostatni || ''} onChange={(e) => updateD('ebitda_ostatni', e.target.value)} placeholder="np. 5 mln PLN" />
          </div>
          <div className="space-y-2">
            <Label>EBITDA plan</Label>
            <Input value={scaleData.ebitda_plan || ''} onChange={(e) => updateD('ebitda_plan', e.target.value)} placeholder="np. 7 mln PLN" />
          </div>
          <div className="space-y-2">
            <Label>Pracownicy</Label>
            <Input value={scaleData.pracownicy || ''} onChange={(e) => updateD('pracownicy', e.target.value)} placeholder="np. 250" />
          </div>
          <div className="space-y-2">
            <Label>Liczba spółek</Label>
            <Input type="number" value={scaleData.liczba_spolek || ''} onChange={(e) => updateD('liczba_spolek', parseInt(e.target.value) || 0)} placeholder="np. 3" />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="holding-smart" checked={scaleData.glowna_vs_holding || false} onCheckedChange={(c) => updateD('glowna_vs_holding', c === true)} />
          <Label htmlFor="holding-smart" className="cursor-pointer">Holding (nie główna spółka operacyjna)</Label>
        </div>

        {/* Inne branże */}
        <div className="space-y-2">
          <Label>Inne branże właściciela</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(scaleData.inne_branze || []).map((b, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1">
                {b}
                <button onClick={() => updateD('inne_branze', removeTag(scaleData.inne_branze, i))} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newBranza} onChange={(e) => setNewBranza(e.target.value)} placeholder="Dodaj branżę..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newBranza.trim()) { updateD('inne_branze', addTag(scaleData.inne_branze, newBranza)); setNewBranza(''); } } }} />
            <Button type="button" variant="outline" size="icon" onClick={() => { if (newBranza.trim()) { updateD('inne_branze', addTag(scaleData.inne_branze, newBranza)); setNewBranza(''); } }}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Kraje */}
        <div className="space-y-2">
          <Label>Kraje działalności</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(scaleData.kraje_dzialalnosci || []).map((k, i) => (
              <Badge key={i} variant="outline" className="px-3 py-1">
                {k}
                <button onClick={() => updateD('kraje_dzialalnosci', removeTag(scaleData.kraje_dzialalnosci, i))} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newKraj} onChange={(e) => setNewKraj(e.target.value)} placeholder="Dodaj kraj..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newKraj.trim()) { updateD('kraje_dzialalnosci', addTag(scaleData.kraje_dzialalnosci, newKraj)); setNewKraj(''); } } }} />
            <Button type="button" variant="outline" size="icon" onClick={() => { if (newKraj.trim()) { updateD('kraje_dzialalnosci', addTag(scaleData.kraje_dzialalnosci, newKraj)); setNewKraj(''); } }}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
