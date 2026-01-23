import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import type { SectionCCompanyProfile } from '../types';

interface SectionCCompanyProfileProps {
  data: SectionCCompanyProfile;
  onChange: (data: SectionCCompanyProfile) => void;
}

export function SectionCCompanyProfileComponent({ data, onChange }: SectionCCompanyProfileProps) {
  const [newProduct, setNewProduct] = useState('');

  const updateField = <K extends keyof SectionCCompanyProfile>(field: K, value: SectionCCompanyProfile[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addProduct = () => {
    if (newProduct.trim()) {
      updateField('produkty_uslugi', [...(data.produkty_uslugi || []), newProduct.trim()]);
      setNewProduct('');
    }
  };

  const removeProduct = (index: number) => {
    const updated = [...(data.produkty_uslugi || [])];
    updated.splice(index, 1);
    updateField('produkty_uslugi', updated);
  };

  return (
    <div className="space-y-6">
      {/* Profil działalności */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Profil działalności</Label>
        
        <div className="space-y-2">
          <Label>Zakres działalności</Label>
          <Textarea
            value={data.zakres_dzialalnosci || ''}
            onChange={(e) => updateField('zakres_dzialalnosci', e.target.value)}
            placeholder="Czym zajmuje się firma..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Rynki (kraj/region)</Label>
          <Input
            value={data.rynki || ''}
            onChange={(e) => updateField('rynki', e.target.value)}
            placeholder="np. Polska, Europa Środkowa, USA"
          />
        </div>

        {/* Produkty/usługi */}
        <div className="space-y-3">
          <Label>Produkty/usługi</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(data.produkty_uslugi || []).map((product, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1.5">
                {product}
                <button onClick={() => removeProduct(index)} className="ml-2 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              placeholder="Dodaj produkt/usługę..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
            />
            <Button type="button" variant="outline" size="icon" onClick={addProduct}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Wartość dla klientów</Label>
          <Textarea
            value={data.wartosc_dla_klientow || ''}
            onChange={(e) => updateField('wartosc_dla_klientow', e.target.value)}
            placeholder="Jak firma pomaga swoim klientom..."
            className="min-h-[60px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Powód dumy (z czego dumny jako przedsiębiorca)</Label>
          <Textarea
            value={data.powod_dumy || ''}
            onChange={(e) => updateField('powod_dumy', e.target.value)}
            placeholder="Z czego jest najbardziej dumny..."
            className="min-h-[60px]"
          />
        </div>
      </div>

      {/* Rola */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Rola w firmie</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tytuł / Stanowisko</Label>
            <Input
              value={data.tytul_rola || ''}
              onChange={(e) => updateField('tytul_rola', e.target.value)}
              placeholder="np. CEO, Prezes, Właściciel"
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="ceo-operacyjny"
              checked={data.ceo_operacyjny || false}
              onCheckedChange={(checked) => updateField('ceo_operacyjny', checked === true)}
            />
            <Label htmlFor="ceo-operacyjny" className="cursor-pointer">
              CEO operacyjny (zarządza na co dzień)
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Poziom decyzyjności (1-5)</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[data.poziom_decyzyjnosci || 3]}
              onValueChange={([value]) => updateField('poziom_decyzyjnosci', value)}
              min={1}
              max={5}
              step={1}
              className="flex-1"
            />
            <Badge variant="outline" className="min-w-[3rem] justify-center">
              {data.poziom_decyzyjnosci || 3}/5
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            1 = doradczy, 5 = pełna decyzyjność
          </p>
        </div>
      </div>

      {/* Własność */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Struktura własności</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>% udziałów rozmówcy</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.procent_udzialow || ''}
              onChange={(e) => updateField('procent_udzialow', parseFloat(e.target.value) || 0)}
              placeholder="np. 51"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="wspolnicy"
            checked={data.wspolnicy || false}
            onCheckedChange={(checked) => updateField('wspolnicy', checked === true)}
          />
          <Label htmlFor="wspolnicy" className="cursor-pointer">
            Ma wspólników
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="inwestor"
            checked={data.inwestor_finansowy || false}
            onCheckedChange={(checked) => updateField('inwestor_finansowy', checked === true)}
          />
          <Label htmlFor="inwestor" className="cursor-pointer">
            Jest inwestor finansowy (PE/VC)
          </Label>
        </div>
      </div>
    </div>
  );
}
