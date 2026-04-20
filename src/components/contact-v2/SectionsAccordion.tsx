import { Building2, Shield, Mail, Calendar, FileText, Brain, History } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const SECTIONS = [
  { id: 'company', label: 'Firma', icon: Building2 },
  { id: 'insurance', label: 'Ubezpieczenia', icon: Shield },
  { id: 'emails', label: 'Emaile', icon: Mail },
  { id: 'meetings', label: 'Spotkania', icon: Calendar },
  { id: 'notes', label: 'Notatki', icon: FileText },
  { id: 'ai', label: 'Pełne dane AI', icon: Brain },
  { id: 'history', label: 'Historia zmian', icon: History },
];

export function SectionsAccordion() {
  return (
    <Accordion type="multiple" className="rounded-xl border bg-card px-4">
      {SECTIONS.map(({ id, label, icon: Icon }) => (
        <AccordionItem key={id} value={id}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{label}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Zawartość dostępna po Sprincie RD-A2
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Sekcja zostanie uzupełniona w kolejnym sprincie.
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
