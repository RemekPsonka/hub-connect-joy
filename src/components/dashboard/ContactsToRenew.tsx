import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserX, Calendar, ArrowRight, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ConsultationModal } from '@/components/consultations/ConsultationModal';
import { differenceInDays, format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ContactToRenew {
  id: string;
  full_name: string;
  last_contact_date: string | null;
  days_since_contact: number;
}

export function ContactsToRenew() {
  const navigate = useNavigate();
  const { director } = useAuth();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts-to-renew', director?.tenant_id],
    queryFn: async (): Promise<ContactToRenew[]> => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data, error } = await supabase
        .from('contacts')
        .select('id, full_name, last_contact_date')
        .eq('is_active', true)
        .or(`last_contact_date.lt.${sixtyDaysAgo.toISOString()},last_contact_date.is.null`)
        .order('last_contact_date', { ascending: true, nullsFirst: true })
        .limit(5);

      if (error) throw error;

      return (data || []).map((contact) => ({
        id: contact.id,
        full_name: contact.full_name,
        last_contact_date: contact.last_contact_date,
        days_since_contact: contact.last_contact_date
          ? differenceInDays(new Date(), new Date(contact.last_contact_date))
          : 999,
      }));
    },
    enabled: !!director?.tenant_id,
  });

  const handleScheduleConsultation = (contactId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContactId(contactId);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <UserX className="h-4 w-4 text-orange-500" />
            Kontakty do odnowienia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!contacts || contacts.length === 0) {
    return null; // Nie pokazuj widgetu jeśli nie ma kontaktów do odnowienia
  }

  return (
    <>
      <Card className="border-orange-200 dark:border-orange-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <UserX className="h-4 w-4 text-orange-500" />
            Kontakty do odnowienia
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              60+ dni bez kontaktu
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <button
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium truncate">{contact.full_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {contact.last_contact_date ? (
                      <>
                        {contact.days_since_contact} dni temu
                        <span className="text-muted-foreground/50">
                          ({format(new Date(contact.last_contact_date), 'd MMM yyyy', { locale: pl })})
                        </span>
                      </>
                    ) : (
                      'Nigdy nie kontaktowano'
                    )}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleScheduleConsultation(contact.id, e)}
                  className="shrink-0 h-8 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Zaplanuj
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/contacts?filter=inactive')}
            className="w-full mt-3 text-muted-foreground hover:text-foreground"
          >
            Zobacz wszystkie
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardContent>
      </Card>

      <ConsultationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContactId(null);
        }}
        prefilledContactId={selectedContactId || undefined}
      />
    </>
  );
}
