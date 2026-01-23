import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RelationshipAlerts } from '@/components/dashboard/RelationshipAlerts';
import { AIRecommendations } from '@/components/dashboard/AIRecommendations';
import { TodaysPriorities } from '@/components/dashboard/TodaysPriorities';
import { DailySerendipity } from '@/components/dashboard/DailySerendipity';
import { UpcomingConsultations } from '@/components/dashboard/UpcomingConsultations';
import { PendingMatches } from '@/components/dashboard/PendingMatches';
import { NetworkOverview } from '@/components/dashboard/NetworkOverview';
import { MeetingsOverview } from '@/components/dashboard/MeetingsOverview';
import { ContactsToRenew } from '@/components/dashboard/ContactsToRenew';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, CheckSquare, Target, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactModal } from '@/components/contacts/ContactModal';

interface Stats {
  contacts: number;
  todayMeetings: number;
  pendingTasks: number;
  activeNeeds: number;
}

export default function Dashboard() {
  const { director } = useAuth();
  const [stats, setStats] = useState<Stats>({ contacts: 0, todayMeetings: 0, pendingTasks: 0, activeNeeds: 0 });
  const [loading, setLoading] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch contacts count
        const { count: contactsCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true });

        // Fetch today's consultations
        const today = new Date().toISOString().split('T')[0];
        const { count: meetingsCount } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_at', `${today}T00:00:00`)
          .lt('scheduled_at', `${today}T23:59:59`);

        // Fetch pending tasks
        const { count: tasksCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Fetch active needs
        const { count: needsCount } = await supabase
          .from('needs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        setStats({
          contacts: contactsCount || 0,
          todayMeetings: meetingsCount || 0,
          pendingTasks: tasksCount || 0,
          activeNeeds: needsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const firstName = director?.full_name?.split(' ')[0] || 'Użytkowniku';
  const hasNoContacts = stats.contacts === 0;

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Witaj, {firstName}!
        </h1>
        <p className="text-muted-foreground capitalize">
          {formatDate(new Date())}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Kontakty"
          value={stats.contacts}
          icon={Users}
          loading={loading}
        />
        <StatsCard
          title="Dzisiejsze konsultacje"
          value={stats.todayMeetings}
          icon={Calendar}
          loading={loading}
        />
        <StatsCard
          title="Oczekujące zadania"
          value={stats.pendingTasks}
          icon={CheckSquare}
          loading={loading}
        />
        <StatsCard
          title="Aktywne potrzeby"
          value={stats.activeNeeds}
          icon={Target}
          loading={loading}
        />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Empty state */}
      {!loading && hasNoContacts && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Zacznij od dodania pierwszego kontaktu
            </h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Twoja sieć kontaktów jest pusta. Dodaj pierwszy kontakt, aby zacząć korzystać z AI Network Assistant.
            </p>
            <Button onClick={() => setIsContactModalOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Dodaj kontakt
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Widgets - show only when there are contacts */}
      {!loading && !hasNoContacts && (
        <>
          {/* Serendipity - full width */}
          <DailySerendipity />
          
          {/* Contacts to renew - full width alert */}
          <ContactsToRenew />
          
          {/* Main grid - 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Kolumna 1: Konsultacje */}
            <UpcomingConsultations />
            
            {/* Kolumna 2: Spotkania grupowe */}
            <MeetingsOverview />
            
            {/* Kolumna 3: Dopasowania AI */}
            <PendingMatches />
            
            {/* Kolumna 4: Sieć */}
            <NetworkOverview />
          </div>
          
          {/* Second row - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TodaysPriorities />
            <AIRecommendations />
            <RelationshipAlerts />
          </div>
        </>
      )}

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
}
