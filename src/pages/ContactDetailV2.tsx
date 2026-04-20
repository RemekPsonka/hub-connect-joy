import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactHeaderTLDR } from '@/components/contact-v2/ContactHeaderTLDR';
import { ActivityTimeline } from '@/components/contact-v2/ActivityTimeline';
import { ContactCRMCard } from '@/components/contact-v2/ContactCRMCard';
import { SectionsAccordion } from '@/components/contact-v2/SectionsAccordion';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContactDetailV2() {
  const { id } = useParams<{ id: string }>();

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(
          'id, full_name, position, email, phone, linkedin_url, company_id, director_id, companies(id, name), contact_groups:primary_group_id(id, name, color), directors:director_id(id, full_name)',
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

  const headerContact = {
    id: contact.id,
    full_name: contact.full_name,
    position: contact.position,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedin_url,
    company_id: contact.company_id,
    companies: (contact as unknown as { companies?: { id: string; name: string } | null }).companies ?? null,
    director_id: contact.director_id,
  };

  return <ContactDetailV2Content id={id} headerContact={headerContact} contact={contact} />;
}

function ContactDetailV2Content({
  id,
  headerContact,
  contact,
}: {
  id: string;
  headerContact: ContactHeaderTLDRProps['contact'];
  contact: { company_id: string | null; email: string | null };
}) {
  const [composerTab, setComposerTab] = useState<'note' | 'email' | 'meeting'>('note');
  const composerRef = useRef<HTMLDivElement>(null);

  const handleSelectAction = (tab: 'note' | 'email' | 'meeting') => {
    setComposerTab(tab);
    setTimeout(() => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      <ContactHeaderTLDR contactId={id} contact={headerContact} onSelectAction={handleSelectAction} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" ref={composerRef}>
          <ActivityTimeline contactId={id} composerTab={composerTab} onComposerTabChange={(t) => setComposerTab(t as 'note' | 'email' | 'meeting')} />
        </div>
        <div>
          <ContactCRMCard contactId={id} />
        </div>
      </div>

      <SectionsAccordion
        contactId={id}
        companyId={contact.company_id ?? null}
        contactEmail={contact.email ?? null}
      />
    </div>
  );
}
