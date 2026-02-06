import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatCard } from '@/components/ui/stat-card';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Witaj, {firstName}!
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {formatDate(new Date())}
        </p>
      </div>

      {/* Stats cards — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Kontakty"
          value={stats.contacts}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Dzisiejsze konsultacje"
          value={stats.todayMeetings}
          icon={Calendar}
          loading={isLoading}
        />
        <StatCard
          title="Oczekujące zadania"
          value={stats.pendingTasks}
          icon={CheckSquare}
          loading={isLoading}
        />
        <StatCard
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
        <DataCard>
          <EmptyState
            icon={UserPlus}
            title="Zacznij od dodania pierwszego kontaktu"
            description="Twoja sieć kontaktów jest pusta. Dodaj pierwszy kontakt, aby zacząć korzystać z AI Network Assistant."
            action={{
              label: 'Dodaj kontakt',
              onClick: () => setIsContactModalOpen(true),
              icon: UserPlus,
            }}
          />
        </DataCard>
      )}

      {/* AI Widgets - show only when there are contacts */}
      {!isLoading && !hasNoContacts && (
        <>
          {/* Task widgets — KPI, My Tasks, Team Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KPITasksWidget />
            <MyTasksWidget />
            <TeamTasksWidget />
          </div>
          
          {/* Main grid — Konsultacje + Spotkania */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UpcomingConsultations />
            <MeetingsOverview />
          </div>

          {/* Dopasowania + Sieć */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PendingMatches />
            <NetworkOverview />
          </div>
          
          {/* Analityka — full width */}
          <AnalyticsOverview />
          
          {/* Zarządzanie relacjami — 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TodaysPriorities />
            <AIRecommendations />
            <RelationshipAlerts />
          </div>
          
          {/* Bottom — mniej pilne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
