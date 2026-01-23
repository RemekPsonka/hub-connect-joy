import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { SectionHInvestments } from '../types';

interface SectionHInvestmentsProps {
  data: SectionHInvestments;
  onChange: (data: SectionHInvestments) => void;
}

const BRAKUJE_TYPES = [
  { value: 'kontakt', label: 'Kontakt' },
  { value: 'finansowanie', label: 'Finansowanie' },
  { value: 'udzialowiec', label: 'Udziałowiec' },
  { value: 'vendor', label: 'Vendor/Dostawca' },
];

export function SectionHInvestmentsComponent({ data, onChange }: SectionHInvestmentsProps) {
  const updateField = <K extends keyof SectionHInvestments>(field: K, value: SectionHInvestments[K]) => {
    onChange({ ...data, [field]: value });
  };

  const toggleBrakujeTyp = (value: string) => {
    const current = data.czego_brakuje_typ || [];
    if (current.includes(value as any)) {
      updateField('czego_brakuje_typ', current.filter(v => v !== value) as SectionHInvestments['czego_brakuje_typ']);
    } else {
      updateField('czego_brakuje_typ', [...current, value] as SectionHInvestments['czego_brakuje_typ']);
    }
  };

  return (
    <div className="space-y-6">
      {/* Ostatnie inwestycje */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Ostatnie inwestycje</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Typ inwestycji</Label>
            <Input
              value={data.ostatnie_typ || ''}
              onChange={(e) => updateField('ostatnie_typ', e.target.value)}
              placeholder="np. M&A, Nieruchomości, Technologia"
            />
          </div>

          <div className="space-y-2">
            <Label>Kwota (opcjonalnie)</Label>
            <Input
              value={data.ostatnie_kwota || ''}
              onChange={(e) => updateField('ostatnie_kwota', e.target.value)}
              placeholder="np. 5 mln PLN"
            />
          </div>

          <div className="space-y-2">
            <Label>Doradcy/partnerzy</Label>
            <Input
              value={data.ostatnie_doradcy || ''}
              onChange={(e) => updateField('ostatnie_doradcy', e.target.value)}
              placeholder="Kto doradzał przy transakcji"
            />
          </div>

          <div className="space-y-2">
            <Label>Decydenci</Label>
            <Input
              value={data.ostatnie_decydenci || ''}
              onChange={(e) => updateField('ostatnie_decydenci', e.target.value)}
              placeholder="Kto podejmuje decyzje inwestycyjne"
            />
          </div>
        </div>
      </div>

      {/* Planowane inwestycje */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Planowane inwestycje</Label>
        
        <div className="space-y-2">
          <Label>Planowane projekty/zakupy/inwestycje</Label>
          <Textarea
            value={data.planowane_projekty || ''}
            onChange={(e) => updateField('planowane_projekty', e.target.value)}
            placeholder="Opisz planowane inwestycje..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-3">
          <Label>Czego brakuje do realizacji</Label>
          <div className="flex flex-wrap gap-2">
            {BRAKUJE_TYPES.map((typ) => {
              const isSelected = (data.czego_brakuje_typ || []).includes(typ.value as any);
              return (
                <Badge
                  key={typ.value}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => toggleBrakujeTyp(typ.value)}
                >
                  {typ.label}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Opis braków</Label>
          <Textarea
            value={data.czego_brakuje || ''}
            onChange={(e) => updateField('czego_brakuje', e.target.value)}
            placeholder="Co jest potrzebne do realizacji inwestycji..."
            className="min-h-[60px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Status inwestycji</Label>
          <Select
            value={data.status || ''}
            onValueChange={(value) => updateField('status', value as SectionHInvestments['status'])}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Wybierz status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="w_trakcie">W trakcie</SelectItem>
              <SelectItem value="loi">LOI</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
