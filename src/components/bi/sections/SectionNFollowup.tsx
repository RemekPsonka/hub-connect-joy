import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarCheck } from 'lucide-react';
import type { SectionNFollowup } from '../types';

interface SectionNFollowupProps {
  data: SectionNFollowup;
  onChange: (data: SectionNFollowup) => void;
}

export function SectionNFollowupComponent({ data, onChange }: SectionNFollowupProps) {
  const updateField = <K extends keyof SectionNFollowup>(field: K, value: SectionNFollowup[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <AccordionItem value="section-n">
      <AccordionTrigger className="text-base font-medium">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          N. Follow-up
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-6">
        {/* Pytania klienta */}
        <div className="space-y-2">
          <Label>Pytania klienta</Label>
          <Textarea
            value={data.pytania_klienta || ''}
            onChange={(e) => updateField('pytania_klienta', e.target.value)}
            placeholder="Jakie pytania zadał klient? Na co trzeba odpowiedzieć?"
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolejne spotkanie */}
          <div className="space-y-2">
            <Label>Kolejne spotkanie – termin</Label>
            <Input
              type="datetime-local"
              value={data.kolejne_spotkanie || ''}
              onChange={(e) => updateField('kolejne_spotkanie', e.target.value)}
            />
          </div>

          {/* Wizyta na spotkaniu CC */}
          <div className="space-y-2">
            <Label>Wizyta na spotkaniu CC – termin</Label>
            <Input
              type="datetime-local"
              value={data.wizyta_cc || ''}
              onChange={(e) => updateField('wizyta_cc', e.target.value)}
            />
          </div>

          {/* Dosłanie dokumentów */}
          <div className="space-y-2">
            <Label>Dosłanie dokumentów – termin</Label>
            <Input
              type="date"
              value={data.doslanie_dokumentow || ''}
              onChange={(e) => updateField('doslanie_dokumentow', e.target.value)}
            />
          </div>
        </div>

        {/* Email do podsumowania (placeholder - będzie generowany przez AI) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Email do podsumowania
            <span className="text-xs text-muted-foreground">(wygenerowany przez AI)</span>
          </Label>
          <Textarea
            value={data.email_podsumowanie || ''}
            onChange={(e) => updateField('email_podsumowanie', e.target.value)}
            placeholder="Tu pojawi się sugerowany email po przetworzeniu AI..."
            className="min-h-[100px]"
            disabled={!data.email_podsumowanie}
          />
        </div>

        {/* Ustalenia końcowe */}
        <div className="space-y-2">
          <Label>Ustalenia końcowe</Label>
          <Textarea
            value={data.ustalenia_koncowe || ''}
            onChange={(e) => updateField('ustalenia_koncowe', e.target.value)}
            placeholder="Podsumowanie ustaleń ze spotkania, action items..."
            className="min-h-[100px]"
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
