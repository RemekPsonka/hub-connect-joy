import { useEffect, useState } from 'react';
import { Building2, Shield, Mail, Calendar, FileText, Brain, History } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SectionCompany } from './sections/SectionCompany';
import { SectionInsurance } from './sections/SectionInsurance';
import { SectionEmails } from './sections/SectionEmails';
import { SectionMeetings } from './sections/SectionMeetings';
import { SectionNotes } from './sections/SectionNotes';
import { SectionAI } from './sections/SectionAI';
import { SectionHistory } from './sections/SectionHistory';

interface SectionsAccordionProps {
  contactId: string;
  companyId: string | null;
  contactEmail: string | null;
  forceOpenHistory?: boolean;
  historyRef?: React.RefObject<HTMLDivElement>;
}

export function SectionsAccordion({
  contactId,
  companyId,
  contactEmail,
  forceOpenHistory,
  historyRef,
}: SectionsAccordionProps) {
  const [open, setOpen] = useState<string[]>([]);
  const isOpen = (id: string) => open.includes(id);

  useEffect(() => {
    if (forceOpenHistory) {
      setOpen((prev) => (prev.includes('history') ? prev : [...prev, 'history']));
    }
  }, [forceOpenHistory]);

  return (
    <Accordion
      type="multiple"
      value={open}
      onValueChange={setOpen}
      className="rounded-xl border bg-card px-4"
    >
      <Item id="company" label="Firma" icon={Building2}>
        <SectionCompany companyId={companyId} enabled={isOpen('company')} />
      </Item>
      <Item id="insurance" label="Ubezpieczenia" icon={Shield}>
        <SectionInsurance companyId={companyId} enabled={isOpen('insurance')} />
      </Item>
      <Item id="emails" label="Emaile" icon={Mail}>
        <SectionEmails contactEmail={contactEmail} enabled={isOpen('emails')} />
      </Item>
      <Item id="meetings" label="Spotkania" icon={Calendar}>
        <SectionMeetings contactId={contactId} enabled={isOpen('meetings')} />
      </Item>
      <Item id="notes" label="Notatki" icon={FileText}>
        <SectionNotes contactId={contactId} enabled={isOpen('notes')} />
      </Item>
      <Item id="ai" label="Pełne dane AI" icon={Brain}>
        <SectionAI contactId={contactId} enabled={isOpen('ai')} />
      </Item>
      <div ref={historyRef}>
        <Item id="history" label="Historia zmian" icon={History}>
          <SectionHistory contactId={contactId} />
        </Item>
      </div>
    </Accordion>
  );
}

function Item({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
