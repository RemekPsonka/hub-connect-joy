import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMyDay } from '@/hooks/useDashboardMyDay';
import { useWeather } from '@/hooks/useWeather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KPIWidget } from '@/components/workspace/widgets/KPIWidget';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  Sparkles,
  UserPlus,
  MessageSquare,
  CalendarPlus,
  Mail,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BriefItem {
  key: string;
  kind: 'overdue' | 'consultation' | 'rec';
  title: string;
  subtitle?: string;
  time?: string;
  onClick: () => void;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { director } = useAuth();
  const { data: myDay, isLoading } = useDashboardMyDay();
  const { data: weather } = useWeather();

  const firstName = director?.full_name?.split(' ')[0] || 'Użytkowniku';
  const today = new Date();
  const dayName = format(today, 'EEEE', { locale: pl });
  const dateStr = format(today, 'd MMMM yyyy', { locale: pl });

  const briefItems: BriefItem[] = [];

  myDay?.consultations_today?.forEach((c) => {
    briefItems.push({
      key: `cons-${c.id}`,
      kind: 'consultation',
      title: `Spotkanie z ${c.contact_name ?? 'kontaktem'}`,
      subtitle: c.is_virtual ? 'Online' : c.location ?? 'Konsultacja',
      time: format(new Date(c.scheduled_at), 'HH:mm'),
      onClick: () => navigate(`/consultations/${c.id}`),
    });
  });

  myDay?.tasks_overdue?.forEach((t) => {
    briefItems.push({
      key: `task-${t.id}`,
      kind: 'overdue',
      title: t.title,
      subtitle: t.due_date
        ? `Termin: ${format(new Date(t.due_date), 'd MMM', { locale: pl })}`
        : 'Zaległe',
      onClick: () => navigate('/workspace'),
    });
  });

  myDay?.top_ai_recs?.forEach((r) => {
    briefItems.push({
      key: `rec-${r.id}`,
      kind: 'rec',
      title: r.title,
      subtitle: 'Rekomendacja Sovry',
      onClick: () => navigate('/sovra'),
    });
  });

  const visibleBrief = briefItems.slice(0, 5);
  const dealChangesCount = myDay?.deals_recent_changes?.length ?? 0;

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dzień dobry, {firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="capitalize">{dayName}</span>
          <span>•</span>
          <span>{dateStr}</span>
          {weather && (
            <>
              <span>•</span>
              <span>
                {weather.icon} {weather.tempC}°C, {weather.description}
              </span>
            </>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget metric="contacts_active" range="30d" />
        <KPIWidget metric="tasks_today" range="30d" />
        <KPIWidget metric="prospects_new" range="30d" />
        <KPIWidget metric="deals_revenue_mtd" range="mtd" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dzisiaj</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : visibleBrief.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Brak pilnych pozycji na dziś. Czyste biurko ✨
              </p>
            ) : (
              <ul className="space-y-1">
                {visibleBrief.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <BriefIcon kind={item.kind} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      </div>
                      {item.time && (
                        <span className="text-sm font-medium text-primary">
                          {item.time}
                        </span>
                      )}
                      <BriefBadge kind={item.kind} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wiadomości</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">0 nowych emaili</p>
                <p className="text-xs text-muted-foreground">Integracja Gmail wkrótce</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/deals-team')}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Briefcase className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {dealChangesCount} zmian w lejku (24h)
                </p>
                <p className="text-xs text-muted-foreground">
                  Zobacz aktywność w lejku sprzedaży
                </p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Szybki start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickTile
            icon={<UserPlus className="h-6 w-6" />}
            label="Dodaj kontakt"
            description="Nowa osoba w sieci"
            onClick={() => navigate('/contacts?new=1')}
            gradient="from-blue-500/10 to-blue-500/5"
          />
          <QuickTile
            icon={<MessageSquare className="h-6 w-6" />}
            label="Rozmowa z Sovrą"
            description="Twój asystent AI"
            onClick={() => navigate('/sovra')}
            gradient="from-purple-500/10 to-purple-500/5"
          />
          <QuickTile
            icon={<CalendarPlus className="h-6 w-6" />}
            label="Nowe spotkanie"
            description="Zaplanuj konsultację"
            onClick={() => navigate('/consultations?new=1')}
            gradient="from-emerald-500/10 to-emerald-500/5"
          />
        </div>
      </section>
    </div>
  );
}

function BriefIcon({ kind }: { kind: BriefItem['kind'] }) {
  const map = {
    overdue: { Icon: AlertTriangle, cls: 'bg-destructive/10 text-destructive' },
    consultation: { Icon: Calendar, cls: 'bg-primary/10 text-primary' },
    rec: { Icon: Sparkles, cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  } as const;
  const { Icon, cls } = map[kind];
  return (
    <div className={cn('h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0', cls)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function BriefBadge({ kind }: { kind: BriefItem['kind'] }) {
  if (kind === 'overdue') return <Badge variant="destructive">Zaległe</Badge>;
  if (kind === 'consultation') return <Badge variant="secondary">Spotkanie</Badge>;
  return <Badge variant="outline">Sovra</Badge>;
}

interface QuickTileProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  gradient: string;
}

function QuickTile({ icon, label, description, onClick, gradient }: QuickTileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-32 rounded-xl border bg-gradient-to-br p-5 text-left transition-all hover:shadow-md hover:scale-[1.01]',
        gradient,
      )}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="text-foreground">{icon}</div>
        <div>
          <p className="font-semibold text-base">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

import { useProjects, getStatusConfig } from '@/hooks/useProjects';
import { useContacts } from '@/hooks/useContacts';
import { useGCalConnection, useGCalEvents } from '@/hooks/useGoogleCalendar';
import { StatCard } from '@/components/ui/stat-card';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContactModal } from '@/components/contacts/ContactModal';
import {
  Users,
  CheckSquare,
  Calendar,
  Heart,
  FolderOpen,
  UserPlus,
  MapPin,
} from 'lucide-react';
import { format, formatDistanceToNow, endOfWeek, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

const LazyActivityChart = lazy(
  () => import('@/components/dashboard/DashboardActivityChart'),
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { director } = useAuth();
  const { data: dashboardStats, isLoading } = useDashboardStats();
  const { data: upcomingConsultations, isLoading: isLoadingConsultations } =
    useUpcomingConsultations(5);
  const { data: allProjects, isLoading: isLoadingProjects } = useProjects();
  const { data: contactsResult, isLoading: isLoadingContacts } = useContacts({
    sortBy: 'created_at',
    sortOrder: 'desc',
    pageSize: 5,
  });

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // GCal data for dashboard widget
  const { isConnected: gcalConnected } = useGCalConnection();
  const now = new Date();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const { data: gcalEvents = [], isLoading: isLoadingGcal } = useGCalEvents(
    now.toISOString(),
    weekEnd.toISOString(),
    gcalConnected
  );
  const upcomingGcalEvents = gcalEvents
    .filter(e => e.start.dateTime) // only timed events
    .slice(0, 5);

  const firstName = director?.full_name?.split(' ')[0] || 'Użytkowniku';
  const formattedDate = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Computed stats ──────────────────────────────
  const totalContacts = dashboardStats?.total_contacts ?? 0;
  const pendingTasks = dashboardStats?.pending_tasks ?? 0;
  const todayConsultations = dashboardStats?.today_consultations ?? 0;

  const healthy = dashboardStats?.healthy_contacts ?? 0;
  const warning = dashboardStats?.warning_contacts ?? 0;
  const critical = dashboardStats?.critical_contacts ?? 0;
  const healthTotal = healthy + warning + critical;
  const healthPercent =
    healthTotal > 0 ? Math.round((healthy / healthTotal) * 100) : 0;

  const prevCount = dashboardStats?.contacts_prev_30d ?? 0;
  const newCount = dashboardStats?.new_contacts_30d ?? 0;
  const contactsTrend =
    prevCount > 0 ? Math.round(((newCount - prevCount) / prevCount) * 100) : 0;

  // ── Filtered projects ───────────────────────────
  const activeStatuses = ['new', 'in_progress', 'analysis'];
  const activeProjects = (allProjects ?? [])
    .filter((p) => activeStatuses.includes(p.status ?? ''))
    .slice(0, 5);

  // ── Recent contacts ─────────────────────────────
  const recentContacts = contactsResult?.data ?? [];

  const hasNoContacts = totalContacts === 0;

  // ── Loading skeleton ────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Witaj, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formattedDate}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4">
          {/* Top: 4 stat skeletons */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-span-1 sm:col-span-3">
              <SkeletonCard variant="stat" />
            </div>
          ))}

          {/* Middle */}
          <div className="col-span-1 sm:col-span-6 lg:col-span-8">
            <SkeletonCard variant="data" lines={6} />
          </div>
          <div className="col-span-1 sm:col-span-6 lg:col-span-4">
            <SkeletonCard variant="list" lines={5} />
          </div>

          {/* Bottom */}
          <div className="col-span-1 sm:col-span-6">
            <SkeletonCard variant="data" lines={5} />
          </div>
          <div className="col-span-1 sm:col-span-6">
            <SkeletonCard variant="data" lines={5} />
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state (no contacts) ───────────────────
  if (hasNoContacts) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Witaj, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formattedDate}
          </p>
        </div>
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
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Witaj, {firstName}!
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {formattedDate}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-4">
        {/* ── Top Row: 4 StatCards ──────────────────── */}
        <div className="col-span-1 sm:col-span-3">
          <StatCard
            label="Kontakty"
            value={totalContacts}
            icon={Users}
            color="blue"
            trend={
              contactsTrend !== 0
                ? { value: contactsTrend, label: 'vs. mies.' }
                : undefined
            }
          />
        </div>
        <div className="col-span-1 sm:col-span-3">
          <StatCard
            label="Zadania w toku"
            value={pendingTasks}
            icon={CheckSquare}
            color="violet"
          />
        </div>
        <div className="col-span-1 sm:col-span-3">
          <StatCard
            label="Spotkania dziś"
            value={todayConsultations}
            icon={Calendar}
            color="emerald"
          />
        </div>
        <div className="col-span-1 sm:col-span-3">
          <StatCard
            label="Średnia relacji"
            value={`${healthPercent}%`}
            icon={Heart}
            color="amber"
          />
        </div>

        {/* ── Middle Row: Activity Chart + Upcoming ── */}
        <div className="col-span-1 sm:col-span-6 lg:col-span-8">
          <DataCard title="Aktywność tygodnia">
            <Suspense fallback={<SkeletonCard variant="data" lines={6} />}>
              <LazyActivityChart />
            </Suspense>
          </DataCard>
        </div>

        <div className="col-span-1 sm:col-span-6 lg:col-span-4">
          <DataCard
            title="Nadchodzące spotkania"
            isLoading={gcalConnected ? isLoadingGcal : isLoadingConsultations}
            footer={
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => navigate(gcalConnected ? '/calendar' : '/consultations')}
              >
                {gcalConnected ? 'Zobacz kalendarz' : 'Zobacz konsultacje'}
              </Button>
            }
          >
            {gcalConnected && upcomingGcalEvents.length > 0 ? (
              <div className="space-y-1">
                {upcomingGcalEvents.map((event) => {
                  const startDt = parseISO(event.start.dateTime!);
                  return (
                    <div
                      key={event.id}
                      className="flex gap-3 w-full text-left rounded-lg p-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="bg-muted rounded-lg px-2 py-1 text-center min-w-[50px] shrink-0">
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {format(startDt, 'EEE', { locale: pl })}
                        </p>
                        <p className="text-sm font-semibold">
                          {format(startDt, 'HH:mm')}
                        </p>
                      </div>
                      <div
                        className="w-1 rounded-full shrink-0"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{event.summary}</p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : gcalConnected && upcomingGcalEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Brak spotkań"
                description="Spokojny tydzień!"
                className="border-0 shadow-none"
              />
            ) : !upcomingConsultations || upcomingConsultations.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Brak spotkań"
                description="Spokojny dzień!"
                className="border-0 shadow-none"
              />
            ) : (
              <div className="space-y-1">
                {upcomingConsultations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/consultations/${c.id}`)}
                    className="flex gap-3 w-full text-left rounded-lg p-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.contacts?.full_name || 'Nieznany kontakt'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.scheduled_at), 'd MMM, HH:mm', {
                          locale: pl,
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DataCard>
        </div>

        {/* ── Bottom Row: Projects + Recent Contacts ── */}
        <div className="col-span-1 sm:col-span-6">
          <DataCard
            title="Projekty w toku"
            isLoading={isLoadingProjects}
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate('/projects')}
              >
                Zobacz wszystkie
              </Button>
            }
          >
            {activeProjects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Brak projektów"
                description="Utwórz swój pierwszy projekt."
                actionLabel="Utwórz projekt"
                onAction={() => navigate('/projects')}
                className="border-0 shadow-none"
              />
            ) : (
              <div className="divide-y divide-border">
                {activeProjects.map((project) => {
                  const statusCfg = getStatusConfig(project.status ?? 'new');
                  return (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="flex items-center justify-between w-full py-2.5 text-left hover:bg-muted/30 transition-colors rounded-md px-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: project.color || '#7C3AED',
                          }}
                        />
                        <span className="text-sm font-medium truncate">
                          {project.name}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] shrink-0 ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </DataCard>
        </div>

        <div className="col-span-1 sm:col-span-6">
          <DataCard
            title="Ostatnio dodane kontakty"
            isLoading={isLoadingContacts}
            action={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => navigate('/contacts')}
              >
                Wszyscy
              </Button>
            }
          >
            {recentContacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Brak kontaktów"
                description="Dodaj pierwszy kontakt, aby go tu zobaczyć."
                className="border-0 shadow-none"
              />
            ) : (
              <div className="divide-y divide-border">
                {recentContacts.map((contact) => {
                  const initials = contact.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <button
                      key={contact.id}
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                      className="flex items-center gap-3 w-full py-2.5 text-left hover:bg-muted/30 transition-colors rounded-md px-1"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {contact.full_name}
                        </p>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.company}
                          </p>
                        )}
                      </div>
                      {contact.created_at && (
                        <span className="text-xs text-muted-foreground/70 shrink-0">
                          {formatDistanceToNow(new Date(contact.created_at), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </DataCard>
        </div>
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
}
