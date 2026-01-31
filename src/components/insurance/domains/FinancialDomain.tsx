import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CreditCard, Package, Scale, Shield } from 'lucide-react';
import { InsuranceStatusToggle } from '../InsuranceStatusToggle';
import type { RyzykoFinansowe, TypDzialnosci, TypGwarancji, ZakresOchronyPrawnej } from '../types';
import { TYP_GWARANCJI_LABELS, ZAKRES_OCHRONY_LABELS } from '../types';

interface FinancialDomainProps {
  data: RyzykoFinansowe;
  onChange: (data: RyzykoFinansowe) => void;
  operationalTypes: TypDzialnosci[];
}

const GWARANCJA_TYPES: TypGwarancji[] = ['wadium', 'nalezyte_wykonanie', 'usuniecie_wad', 'zaliczkowa', 'platnicza'];
const ZAKRES_OPTIONS: ZakresOchronyPrawnej[] = ['podstawowy', 'rozszerzony', 'pelny'];

function getRecommendations(operationalTypes: TypDzialnosci[]): string[] {
  const recommendations: string[] = [];
  
  if (operationalTypes.includes('produkcja') || operationalTypes.includes('handel')) {
    recommendations.push('Kredyt kupiecki - ochrona należności od kontrahentów');
  }
  if (operationalTypes.includes('import_export')) {
    recommendations.push('Gwarancje celne - zabezpieczenie należności VAT/cło');
    recommendations.push('Kredyt kupiecki eksportowy - ryzyko zagranicznych odbiorców');
  }
  if (operationalTypes.includes('uslugi')) {
    recommendations.push('Gwarancje kontraktowe - wadium, należyte wykonanie');
  }
  if (operationalTypes.includes('ecommerce')) {
    recommendations.push('Ochrona prawna - windykacja wierzytelności');
  }
  
  return recommendations;
}

export function FinancialDomain({ data, onChange, operationalTypes }: FinancialDomainProps) {
  const recommendations = getRecommendations(operationalTypes);
  
  const handleGwarancjaTypeToggle = (type: TypGwarancji, checked: boolean) => {
    const currentTypes = data.gwarancje_typy || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter((t) => t !== type);
    onChange({ ...data, gwarancje_typy: newTypes });
  };

  return (
    <div className="space-y-6">
      {/* Rekomendacje na podstawie DNA */}
      {recommendations.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Rekomendacje dla Twojego profilu:
            </span>
          </div>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            {recommendations.map((rec, i) => (
              <li key={i}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Gwarancje Kontraktowe */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">Gwarancje Kontraktowe</h4>
        </div>
        
        <InsuranceStatusToggle
          value={data.gwarancje_kontraktowe_status}
          onChange={(v) => onChange({ ...data, gwarancje_kontraktowe_status: v })}
        />
        
        {data.gwarancje_kontraktowe_status !== 'nie_dotyczy' && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="gwarancje_limit" className="text-sm">
                Limit roczny (PLN)
              </Label>
              <Input
                id="gwarancje_limit"
                type="number"
                placeholder="np. 5000000"
                value={data.gwarancje_limit_roczny || ''}
                onChange={(e) =>
                  onChange({ ...data, gwarancje_limit_roczny: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Typy gwarancji</Label>
              <div className="flex flex-wrap gap-2">
                {GWARANCJA_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={data.gwarancje_typy?.includes(type) || false}
                      onCheckedChange={(checked) => handleGwarancjaTypeToggle(type, !!checked)}
                    />
                    <span className="text-sm">{TYP_GWARANCJI_LABELS[type]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gwarancje Celne i Podatkowe */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">Gwarancje Celne i Podatkowe</h4>
          {operationalTypes.includes('import_export') && (
            <Badge variant="outline" className="text-xs">Rekomendowane</Badge>
          )}
        </div>
        
        <InsuranceStatusToggle
          value={data.gwarancje_celne_status}
          onChange={(v) => onChange({ ...data, gwarancje_celne_status: v })}
        />
        
        {data.gwarancje_celne_status !== 'nie_dotyczy' && (
          <div className="space-y-1 pt-2">
            <Label htmlFor="gwarancje_celne_limit" className="text-sm">
              Limit zabezpieczeń (PLN)
            </Label>
            <Input
              id="gwarancje_celne_limit"
              type="number"
              placeholder="np. 1000000"
              value={data.gwarancje_celne_limit || ''}
              onChange={(e) =>
                onChange({ ...data, gwarancje_celne_limit: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        )}
      </div>

      {/* Kredyt Kupiecki (Trade Credit) */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">Kredyt Kupiecki (Trade Credit)</h4>
          {(operationalTypes.includes('handel') || operationalTypes.includes('produkcja')) && (
            <Badge variant="outline" className="text-xs">Rekomendowane</Badge>
          )}
        </div>
        
        <InsuranceStatusToggle
          value={data.kredyt_kupiecki_status}
          onChange={(v) => onChange({ ...data, kredyt_kupiecki_status: v })}
        />
        
        {data.kredyt_kupiecki_status !== 'nie_dotyczy' && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="obroty_ubezpieczone" className="text-sm">
                Obroty ubezpieczone (PLN)
              </Label>
              <Input
                id="obroty_ubezpieczone"
                type="number"
                placeholder="np. 10000000"
                value={data.kredyt_kupiecki_obroty_ubezpieczone || ''}
                onChange={(e) =>
                  onChange({
                    ...data,
                    kredyt_kupiecki_obroty_ubezpieczone: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={data.kredyt_kupiecki_eksport || false}
                onCheckedChange={(checked) => onChange({ ...data, kredyt_kupiecki_eksport: !!checked })}
              />
              <span className="text-sm">Eksport (ryzyko zagraniczne)</span>
            </label>
            
            {data.kredyt_kupiecki_eksport && (
              <div className="space-y-1">
                <Label htmlFor="glowne_kraje" className="text-sm">
                  Główne kraje eksportu (oddzielone przecinkami)
                </Label>
                <Input
                  id="glowne_kraje"
                  placeholder="np. DE, CZ, UK, FR"
                  value={data.kredyt_kupiecki_glowne_kraje?.join(', ') || ''}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      kredyt_kupiecki_glowne_kraje: e.target.value
                        ? e.target.value.split(',').map((s) => s.trim().toUpperCase())
                        : undefined,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ochrona Prawna (Wierzytelności) */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">Ochrona Prawna (Wierzytelności)</h4>
        </div>
        
        <InsuranceStatusToggle
          value={data.ochrona_prawna_status}
          onChange={(v) => onChange({ ...data, ochrona_prawna_status: v })}
        />
        
        {data.ochrona_prawna_status !== 'nie_dotyczy' && (
          <div className="space-y-1 pt-2">
            <Label htmlFor="zakres_ochrony" className="text-sm">
              Zakres ochrony
            </Label>
            <Select
              value={data.ochrona_prawna_zakres || ''}
              onValueChange={(v) => onChange({ ...data, ochrona_prawna_zakres: v as ZakresOchronyPrawnej })}
            >
              <SelectTrigger id="zakres_ochrony">
                <SelectValue placeholder="Wybierz zakres" />
              </SelectTrigger>
              <SelectContent>
                {ZAKRES_OPTIONS.map((zakres) => (
                  <SelectItem key={zakres} value={zakres}>
                    {ZAKRES_OCHRONY_LABELS[zakres]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Uwagi */}
      <div className="space-y-1">
        <Label htmlFor="uwagi_finansowe" className="text-sm">
          Uwagi dodatkowe
        </Label>
        <Textarea
          id="uwagi_finansowe"
          placeholder="Dodatkowe informacje o ubezpieczeniach finansowych..."
          value={data.uwagi || ''}
          onChange={(e) => onChange({ ...data, uwagi: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}
