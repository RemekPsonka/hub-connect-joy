import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SectionNFollowup } from '../types';

interface SmartSectionFollowupProps {
  data: SectionNFollowup;
  onChange: (data: SectionNFollowup) => void;
}

export const FOLLOWUP_FIELDS = [
  'pytania_klienta', 'kolejne_spotkanie', 'wizyta_cc', 'doslanie_dokumentow',
  'ustalenia_koncowe', 'email_podsumowanie',
];

export function SmartSectionFollowupComponent({ data, onChange }: SmartSectionFollowupProps) {
  const updateField = <K extends keyof SectionNFollowup>(field: K, value: SectionNFollowup[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Pytania klienta</Label>
        <Textarea value={data.pytania_klienta || ''} onChange={(e) => updateField('pytania_klienta', e.target.value)} placeholder="Jakie pytania zadał klient?" className="min-h-[70px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kolejne spotkanie – termin</Label>
          <Input type="datetime-local" value={data.kolejne_spotkanie || ''} onChange={(e) => updateField('kolejne_spotkanie', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Wizyta na spotkaniu CC – termin</Label>
          <Input type="datetime-local" value={data.wizyta_cc || ''} onChange={(e) => updateField('wizyta_cc', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Dosłanie dokumentów – termin</Label>
          <Input type="date" value={data.doslanie_dokumentow || ''} onChange={(e) => updateField('doslanie_dokumentow', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Email do podsumowania
          <span className="text-xs text-muted-foreground">(wygenerowany przez AI)</span>
        </Label>
        <Textarea value={data.email_podsumowanie || ''} onChange={(e) => updateField('email_podsumowanie', e.target.value)} placeholder="Tu pojawi się sugerowany email..." className="min-h-[80px]" disabled={!data.email_podsumowanie} />
      </div>

      <div className="space-y-2">
        <Label>Ustalenia końcowe</Label>
        <Textarea value={data.ustalenia_koncowe || ''} onChange={(e) => updateField('ustalenia_koncowe', e.target.value)} placeholder="Podsumowanie ustaleń, action items..." className="min-h-[80px]" />
      </div>
    </div>
  );
}
