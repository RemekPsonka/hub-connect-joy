import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
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
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview';
import { KPITasksWidget } from '@/components/dashboard/KPITasksWidget';
import { MyTasksWidget } from '@/components/dashboard/MyTasksWidget';
import { TeamTasksWidget } from '@/components/dashboard/TeamTasksWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, CheckSquare, Target, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactModal } from '@/components/contacts/ContactModal';

export default function Dashboard() {
  const { director } = useAuth();
  const { data: dashboardStats, isLoading } = useDashboardStats();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Computed values from MV
  const stats = {
    contacts: dashboardStats?.total_contacts ?? 0,
    todayMeetings: dashboardStats?.today_consultations ?? 0,
    pendingTasks: dashboardStats?.pending_tasks ?? 0,
    activeNeeds: dashboardStats?.active_needs ?? 0,
  };

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
          loading={isLoading}
        />
        <StatsCard
          title="Dzisiejsze konsultacje"
          value={stats.todayMeetings}
          icon={Calendar}
          loading={isLoading}
        />
        <StatsCard
          title="Oczekujące zadania"
          value={stats.pendingTasks}
          icon={CheckSquare}
          loading={isLoading}
        />
        <StatsCard
          title="Aktywne potrzeby"
          value={stats.activeNeeds}
          icon={Target}
          loading={isLoading}
        />
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Empty state */}
      {!isLoading && hasNoContacts && (
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
      {!isLoading && !hasNoContacts && (
        <>
          {/* Task widgets - KPI, My Tasks, Team Tasks (najważniejsze) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <KPITasksWidget />
            <MyTasksWidget />
            <TeamTasksWidget />
          </div>
          
          {/* Main grid - 2x2 for main widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kolumna 1: Konsultacje */}
            <UpcomingConsultations />
            
            {/* Kolumna 2: Spotkania grupowe */}
            <MeetingsOverview />
            
            {/* Kolumna 3: Dopasowania AI */}
            <PendingMatches />
            
            {/* Kolumna 4: Sieć */}
            <NetworkOverview />
          </div>
          
          {/* Analityka - full width */}
          <AnalyticsOverview />
          
          {/* Zarządzanie relacjami - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TodaysPriorities />
            <AIRecommendations />
            <RelationshipAlerts />
          </div>
          
          {/* DÓŁ STRONY - mniej pilne, obok siebie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DailySerendipity />
            <ContactsToRenew />
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
