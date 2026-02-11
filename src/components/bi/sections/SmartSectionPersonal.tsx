import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus, Users } from 'lucide-react';
import type { SectionLPersonal, SectionMOrganizations, CzlonekRodziny } from '../types';

interface SmartSectionPersonalProps {
  personalData: SectionLPersonal;
  orgsData: SectionMOrganizations;
  onPersonalChange: (data: SectionLPersonal) => void;
  onOrgsChange: (data: SectionMOrganizations) => void;
}

export const PERSONAL_FIELDS = ['miasto_bazowe', 'hobby', 'cele_prywatne', 'sukcesja', 'partner', 'dzieci'];
export const ORGS_FIELDS = ['fundacje_csr', 'organizacje_branzowe', 'izby_handlowe', 'stowarzyszenia', 'inne'];

export function SmartSectionPersonalComponent({ personalData, orgsData, onPersonalChange, onOrgsChange }: SmartSectionPersonalProps) {
  const [newHobby, setNewHobby] = useState('');
  const [newLok, setNewLok] = useState('');

  const updateL = <K extends keyof SectionLPersonal>(f: K, v: SectionLPersonal[K]) => onPersonalChange({ ...personalData, [f]: v });
  const updateM = <K extends keyof SectionMOrganizations>(f: K, v: SectionMOrganizations[K]) => onOrgsChange({ ...orgsData, [f]: v });

  const updatePartner = (f: keyof CzlonekRodziny, v: string | number) => updateL('partner', { ...(personalData.partner || {}), [f]: v });
  const addChild = () => updateL('dzieci', [...(personalData.dzieci || []), { imie: '', wiek: undefined, zajecie: '' }]);
  const updateChild = (i: number, f: keyof CzlonekRodziny, v: string | number) => {
    const u = [...(personalData.dzieci || [])];
    u[i] = { ...u[i], [f]: v };
    updateL('dzieci', u);
  };
  const removeChild = (i: number) => { const u = [...(personalData.dzieci || [])]; u.splice(i, 1); updateL('dzieci', u); };

  const addTag = (arr: string[] | undefined, v: string) => [...(arr || []), v.trim()];
  const removeTag = (arr: string[] | undefined, i: number) => { const u = [...(arr || [])]; u.splice(i, 1); return u; };

  // Org tag state
  const [newOrgValues, setNewOrgValues] = useState<Record<string, string>>({});
  const orgFields = [
    { field: 'fundacje_csr' as const, label: 'Fundacje / CSR', ph: 'Dodaj fundację...' },
    { field: 'organizacje_branzowe' as const, label: 'Organizacje branżowe', ph: 'Dodaj organizację...' },
    { field: 'izby_handlowe' as const, label: 'Izby handlowe', ph: 'Dodaj izbę...' },
    { field: 'stowarzyszenia' as const, label: 'Stowarzyszenia', ph: 'Dodaj stowarzyszenie...' },
  ];

  return (
    <div className="space-y-6">
      {/* --- Rodzina --- */}
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-medium">Rodzina</Label>
        </div>

        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Partner / Małżonek</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={personalData.partner?.imie || ''} onChange={(e) => updatePartner('imie', e.target.value)} placeholder="Imię" />
            <Input type="number" value={personalData.partner?.wiek || ''} onChange={(e) => updatePartner('wiek', e.target.value ? parseInt(e.target.value) : '')} placeholder="Wiek" min={0} max={120} />
            <Input value={personalData.partner?.zajecie || ''} onChange={(e) => updatePartner('zajecie', e.target.value)} placeholder="Czym się zajmuje" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Dzieci</Label>
            <Button type="button" variant="outline" size="sm" onClick={addChild}><Plus className="h-3 w-3 mr-1" />Dodaj</Button>
          </div>
          {(personalData.dzieci || []).map((d, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr_32px] gap-3 items-center">
              <Input value={d.imie || ''} onChange={(e) => updateChild(i, 'imie', e.target.value)} placeholder="Imię" />
              <Input type="number" value={d.wiek || ''} onChange={(e) => updateChild(i, 'wiek', e.target.value ? parseInt(e.target.value) : '')} placeholder="Wiek" min={0} max={120} />
              <Input value={d.zajecie || ''} onChange={(e) => updateChild(i, 'zajecie', e.target.value)} placeholder="Zajęcie" />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      {/* Lokalizacja, hobby */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Miasto bazowe</Label>
          <Input value={personalData.miasto_bazowe || ''} onChange={(e) => updateL('miasto_bazowe', e.target.value)} placeholder="np. Warszawa" />
        </div>
      </div>

      {/* Częste lokalizacje */}
      <div className="space-y-2">
        <Label>Częste lokalizacje</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(personalData.czeste_lokalizacje || []).map((l, i) => (
            <Badge key={i} variant="outline" className="px-3 py-1">{l}<button onClick={() => updateL('czeste_lokalizacje', removeTag(personalData.czeste_lokalizacje, i))} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newLok} onChange={(e) => setNewLok(e.target.value)} placeholder="Dodaj lokalizację..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newLok.trim()) { updateL('czeste_lokalizacje', addTag(personalData.czeste_lokalizacje, newLok)); setNewLok(''); } } }} />
          <Button type="button" variant="outline" size="icon" onClick={() => { if (newLok.trim()) { updateL('czeste_lokalizacje', addTag(personalData.czeste_lokalizacje, newLok)); setNewLok(''); } }}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Hobby */}
      <div className="space-y-2">
        <Label>Hobby / Pasje</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(personalData.hobby || []).map((h, i) => (
            <Badge key={i} variant="secondary" className="px-3 py-1">{h}<button onClick={() => updateL('hobby', removeTag(personalData.hobby, i))} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newHobby} onChange={(e) => setNewHobby(e.target.value)} placeholder="Dodaj hobby..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newHobby.trim()) { updateL('hobby', addTag(personalData.hobby, newHobby)); setNewHobby(''); } } }} />
          <Button type="button" variant="outline" size="icon" onClick={() => { if (newHobby.trim()) { updateL('hobby', addTag(personalData.hobby, newHobby)); setNewHobby(''); } }}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cele prywatne 2-3 lata</Label>
        <Textarea value={personalData.cele_prywatne || ''} onChange={(e) => updateL('cele_prywatne', e.target.value)} placeholder="Cele prywatne..." className="min-h-[50px]" />
      </div>

      {/* Sukcesja */}
      <div className="flex items-start gap-4 p-3 border rounded-lg">
        <div className="flex items-center space-x-2 min-w-[120px]">
          <Checkbox id="sukc-smart" checked={personalData.sukcesja || false} onCheckedChange={(c) => updateL('sukcesja', c === true)} />
          <Label htmlFor="sukc-smart" className="cursor-pointer font-medium">Sukcesja</Label>
        </div>
        {personalData.sukcesja && (
          <Input value={personalData.sukcesja_opis || ''} onChange={(e) => updateL('sukcesja_opis', e.target.value)} placeholder="Plany sukcesji..." className="flex-1" />
        )}
      </div>

      {/* --- Organizacje --- */}
      <div className="border-t pt-4 space-y-4">
        <Label className="text-sm font-medium text-muted-foreground">Organizacje i członkostwa</Label>

        {orgFields.map(({ field, label, ph }) => (
          <div key={field} className="space-y-2">
            <Label>{label}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(orgsData[field] || []).map((item, i) => (
                <Badge key={i} variant="outline" className="px-3 py-1">{item}<button onClick={() => updateM(field, removeTag(orgsData[field], i))} className="ml-2 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newOrgValues[field] || ''}
                onChange={(e) => setNewOrgValues((p) => ({ ...p, [field]: e.target.value }))}
                placeholder={ph}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = newOrgValues[field]; if (v?.trim()) { updateM(field, addTag(orgsData[field], v)); setNewOrgValues((p) => ({ ...p, [field]: '' })); } } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => { const v = newOrgValues[field]; if (v?.trim()) { updateM(field, addTag(orgsData[field], v)); setNewOrgValues((p) => ({ ...p, [field]: '' })); } }}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <Label>Inne członkostwa</Label>
          <Textarea value={orgsData.inne || ''} onChange={(e) => updateM('inne', e.target.value)} placeholder="Inne organizacje, kluby..." className="min-h-[50px]" />
        </div>
      </div>
    </div>
  );
}
