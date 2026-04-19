import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMyDay } from '@/hooks/useDashboardMyDay';
import { useWeather } from '@/hooks/useWeather';
import { useTask } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KPIWidget } from '@/components/workspace/widgets/KPIWidget';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
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
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const { data: openTask } = useTask(openTaskId ?? undefined);

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
      onClick: () => setOpenTaskId(t.id),
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
