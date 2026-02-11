import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import type { SectionFStrategy, SectionGNeeds, SectionHInvestments } from '../types';
import { SEEKING_CATEGORIES } from '../types';

interface SmartSectionStrategyProps {
  strategyData: SectionFStrategy;
  needsData: SectionGNeeds;
  investmentsData: SectionHInvestments;
  onStrategyChange: (data: SectionFStrategy) => void;
  onNeedsChange: (data: SectionGNeeds) => void;
  onInvestmentsChange: (data: SectionHInvestments) => void;
}

export const STRATEGY_FIELDS = ['cele_strategiczne', 'wplyw_makro', 'szanse', 'ryzyka'];
export const NEEDS_FIELDS = ['top3_priorytety', 'najwieksze_wyzwanie', 'czego_poszukuje', 'jakich_kontaktow', 'jakich_rekomendacji', 'grupa_docelowa'];
export const INVESTMENTS_FIELDS = ['ostatnie_typ', 'planowane_projekty', 'czego_brakuje_typ', 'status'];

const BRAKUJE_TYPES = [
  { value: 'kontakt', label: 'Kontakt' },
  { value: 'finansowanie', label: 'Finansowanie' },
  { value: 'udzialowiec', label: 'Udziałowiec' },
  { value: 'vendor', label: 'Vendor/Dostawca' },
];

export function SmartSectionStrategyComponent({ strategyData, needsData, investmentsData, onStrategyChange, onNeedsChange, onInvestmentsChange }: SmartSectionStrategyProps) {
  const [newPriority, setNewPriority] = useState('');

  const updateF = <K extends keyof SectionFStrategy>(f: K, v: SectionFStrategy[K]) => onStrategyChange({ ...strategyData, [f]: v });
  const updateG = <K extends keyof SectionGNeeds>(f: K, v: SectionGNeeds[K]) => onNeedsChange({ ...needsData, [f]: v });
  const updateH = <K extends keyof SectionHInvestments>(f: K, v: SectionHInvestments[K]) => onInvestmentsChange({ ...investmentsData, [f]: v });

  const addPriority = () => {
    if (newPriority.trim() && (!needsData.top3_priorytety || needsData.top3_priorytety.length < 3)) {
      updateG('top3_priorytety', [...(needsData.top3_priorytety || []), newPriority.trim()]);
      setNewPriority('');
    }
  };

  const toggleSeeking = (value: string) => {
    const current = needsData.czego_poszukuje || [];
    if (current.includes(value)) {
      updateG('czego_poszukuje', current.filter((v) => v !== value));
    } else {
      updateG('czego_poszukuje', [...current, value]);
    }
  };

  const toggleBrakuje = (value: string) => {
    const current = investmentsData.czego_brakuje_typ || [];
    if (current.includes(value as any)) {
      updateH('czego_brakuje_typ', current.filter((v) => v !== value) as any);
    } else {
      updateH('czego_brakuje_typ', [...current, value] as any);
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Cele i kierunki --- */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Cele i kierunki</Label>

        <div className="space-y-2">
          <Label>Cele strategiczne 2-3 lata</Label>
          <Textarea value={strategyData.cele_strategiczne || ''} onChange={(e) => updateF('cele_strategiczne', e.target.value)} placeholder="Główne cele strategiczne..." className="min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label>Wpływ makro / trendów</Label>
          <Textarea value={strategyData.wplyw_makro || ''} onChange={(e) => updateF('wplyw_makro', e.target.value)} placeholder="Jak trendy rynkowe wpływają..." className="min-h-[60px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Szanse</Label>
            <Textarea value={strategyData.szanse || ''} onChange={(e) => updateF('szanse', e.target.value)} placeholder="Szanse na rynku..." className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label>Ryzyka</Label>
            <Textarea value={strategyData.ryzyka || ''} onChange={(e) => updateF('ryzyka', e.target.value)} placeholder="Ryzyka..." className="min-h-[80px]" />
          </div>
        </div>
      </div>

      {/* --- Potrzeby biznesowe --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Potrzeby biznesowe</Label>

        {/* Top 3 priorytety */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">Top 3 priorytety <span className="text-destructive">*</span></Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(needsData.top3_priorytety || []).map((p, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1">
                {i + 1}. {p}
                <button onClick={() => { const u = [...(needsData.top3_priorytety || [])]; u.splice(i, 1); updateG('top3_priorytety', u); }} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          {(!needsData.top3_priorytety || needsData.top3_priorytety.length < 3) && (
            <div className="flex gap-2">
              <Input value={newPriority} onChange={(e) => setNewPriority(e.target.value)} placeholder={`Priorytet ${(needsData.top3_priorytety?.length || 0) + 1}...`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPriority(); } }} />
              <Button type="button" variant="outline" size="icon" onClick={addPriority}><Plus className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Największe wyzwanie</Label>
          <Textarea value={needsData.najwieksze_wyzwanie || ''} onChange={(e) => updateG('najwieksze_wyzwanie', e.target.value)} placeholder="Główne wyzwanie..." className="min-h-[60px]" />
        </div>

        {/* Czego poszukuje */}
        <div className="space-y-2">
          <Label>Czego poszukuje</Label>
          <div className="flex flex-wrap gap-2">
            {SEEKING_CATEGORIES.map((cat) => (
              <Badge key={cat.value} variant={(needsData.czego_poszukuje || []).includes(cat.value) ? 'default' : 'outline'} className="cursor-pointer px-3 py-1.5" onClick={() => toggleSeeking(cat.value)}>
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Jakich kontaktów potrzebuje</Label>
          <Textarea value={needsData.jakich_kontaktow || ''} onChange={(e) => updateG('jakich_kontaktow', e.target.value)} placeholder="Profile osób/firm..." className="min-h-[50px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Horyzont czasowy</Label>
            <Select value={needsData.horyzont_czasowy || ''} onValueChange={(v) => updateG('horyzont_czasowy', v as SectionGNeeds['horyzont_czasowy'])}>
              <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0-6">0-6 miesięcy</SelectItem>
                <SelectItem value="6-18">6-18 miesięcy</SelectItem>
                <SelectItem value="18+">18+ miesięcy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priorytet potrzeb</Label>
            <Select value={needsData.priorytet || ''} onValueChange={(v) => updateG('priorytet', v as SectionGNeeds['priorytet'])}>
              <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="niski">Niski</SelectItem>
                <SelectItem value="sredni">Średni</SelectItem>
                <SelectItem value="wysoki">Wysoki</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* --- Inwestycje --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Inwestycje</Label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Typ ostatniej inwestycji</Label>
            <Input value={investmentsData.ostatnie_typ || ''} onChange={(e) => updateH('ostatnie_typ', e.target.value)} placeholder="np. M&A, Nieruchomości" />
          </div>
          <div className="space-y-2">
            <Label>Kwota</Label>
            <Input value={investmentsData.ostatnie_kwota || ''} onChange={(e) => updateH('ostatnie_kwota', e.target.value)} placeholder="np. 5 mln PLN" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Planowane projekty</Label>
          <Textarea value={investmentsData.planowane_projekty || ''} onChange={(e) => updateH('planowane_projekty', e.target.value)} placeholder="Planowane inwestycje..." className="min-h-[60px]" />
        </div>

        <div className="space-y-2">
          <Label>Czego brakuje do realizacji</Label>
          <div className="flex flex-wrap gap-2">
            {BRAKUJE_TYPES.map((t) => (
              <Badge key={t.value} variant={(investmentsData.czego_brakuje_typ || []).includes(t.value as any) ? 'default' : 'outline'} className="cursor-pointer px-3 py-1.5" onClick={() => toggleBrakuje(t.value)}>
                {t.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={investmentsData.status || ''} onValueChange={(v) => updateH('status', v as SectionHInvestments['status'])}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Wybierz" /></SelectTrigger>
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
