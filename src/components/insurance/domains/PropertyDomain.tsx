import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';
import type { RyzykoMajatkowe, DomainProps } from '../types';

export function PropertyDomain({ data, onChange, operationalTypes }: DomainProps<RyzykoMajatkowe>) {
  const showProductionFields = operationalTypes.includes('produkcja');
  
  const updateField = <K extends keyof RyzykoMajatkowe>(field: K, value: RyzykoMajatkowe[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Status ubezpieczenia</Label>
        <InsuranceStatusToggle
          value={data.status}
          onChange={(status) => updateField('status', status)}
        />
      </div>

      {data.status !== 'nie_dotyczy' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="liczba_lokalizacji">Liczba lokalizacji</Label>
            <Input
              id="liczba_lokalizacji"
              type="number"
              min={0}
              value={data.liczba_lokalizacji || ''}
              onChange={(e) => updateField('liczba_lokalizacji', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="typ_wlasnosci">Typ własności</Label>
            <Select
              value={data.typ_wlasnosci || ''}
              onValueChange={(val) => updateField('typ_wlasnosci', val as RyzykoMajatkowe['typ_wlasnosci'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wlasnosc">Własność</SelectItem>
                <SelectItem value="najem">Najem</SelectItem>
                <SelectItem value="mieszane">Mieszane</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suma_majatek">Suma ubezpieczenia - Majątek (PLN)</Label>
            <Input
              id="suma_majatek"
              type="number"
              min={0}
              value={data.suma_ubezp_majatek || ''}
              onChange={(e) => updateField('suma_ubezp_majatek', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 45000000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suma_bi">Suma ubezpieczenia - BI (PLN)</Label>
            <Input
              id="suma_bi"
              type="number"
              min={0}
              value={data.suma_ubezp_bi || ''}
              onChange={(e) => updateField('suma_ubezp_bi', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="np. 12000000"
            />
          </div>

          {showProductionFields && (
            <>
              <div className="flex items-center gap-2 col-span-full">
                <Checkbox
                  id="materialy_latwopalne"
                  checked={data.materialy_latwopalne || false}
                  onCheckedChange={(checked) => updateField('materialy_latwopalne', checked === true)}
                />
                <Label htmlFor="materialy_latwopalne" className="text-sm cursor-pointer">
                  Materiały łatwopalne w produkcji
                </Label>
              </div>

              <div className="flex items-center gap-2 col-span-full">
                <Checkbox
                  id="awaria_maszyn"
                  checked={data.awaria_maszyn || false}
                  onCheckedChange={(checked) => updateField('awaria_maszyn', checked === true)}
                />
                <Label htmlFor="awaria_maszyn" className="text-sm cursor-pointer">
                  Pokrycie awarii maszyn (MB)
                </Label>
              </div>
            </>
          )}

          <div className="space-y-2 col-span-full">
            <Label htmlFor="uwagi_majatek">Uwagi</Label>
            <Textarea
              id="uwagi_majatek"
              value={data.uwagi || ''}
              onChange={(e) => updateField('uwagi', e.target.value)}
              placeholder="Dodatkowe informacje..."
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
