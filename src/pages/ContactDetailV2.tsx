import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactHeaderTLDR } from '@/components/contact-v2/ContactHeaderTLDR';
import { ActivityTimeline } from '@/components/contact-v2/ActivityTimeline';
import { ContactCRMCard } from '@/components/contact-v2/ContactCRMCard';
import { SectionsAccordion } from '@/components/contact-v2/SectionsAccordion';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContactWithGroup } from '@/hooks/useContacts';

export default function ContactDetailV2() {
  const { id } = useParams<{ id: string }>();
  const [composerTab, setComposerTab] = useState<'note' | 'email' | 'meeting'>('note');
  const composerRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(
          '*, companies(id, name), contact_groups:primary_group_id(id, name, color), directors:director_id(id, full_name)',
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading || !contact || !id) {
    return (
      <div className="container mx-auto max-w-7xl p-6 space-y-4">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const contactRecord = contact as unknown as {
    id: string;
    full_name: string;
    position: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    company_id: string | null;
    director_id: string | null;
    companies?: { id: string; name: string } | null;
  };

  const headerContact = {
    id: contactRecord.id,
    full_name: contactRecord.full_name,
    position: contactRecord.position,
    email: contactRecord.email,
    phone: contactRecord.phone,
    linkedin_url: contactRecord.linkedin_url,
    company_id: contactRecord.company_id,
    companies: contactRecord.companies ?? null,
    director_id: contactRecord.director_id,
  };

  const handleSelectAction = (tab: 'note' | 'email' | 'meeting') => {
    setComposerTab(tab);
    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleRequestHistory = () => {
    setHistoryOpen(true);
    setTimeout(() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      <ContactHeaderTLDR
        contactId={id}
        contact={headerContact}
        fullContact={contact as unknown as ContactWithGroup}
        onSelectAction={handleSelectAction}
        onRequestHistory={handleRequestHistory}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" ref={composerRef}>
          <ActivityTimeline
            contactId={id}
            composerTab={composerTab}
            onComposerTabChange={(t) => setComposerTab(t as 'note' | 'email' | 'meeting')}
          />
        </div>
        <div>
          <ContactCRMCard contactId={id} />
        </div>
      </div>

      <SectionsAccordion
        contactId={id}
        companyId={contactRecord.company_id ?? null}
        contactEmail={contactRecord.email ?? null}
        forceOpenHistory={historyOpen}
        historyRef={historyRef}
      />
    </div>
  );
}
