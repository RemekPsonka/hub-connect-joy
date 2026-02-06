import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  MessageSquare,
  ArrowRight,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  Activity,
  Trophy,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DealActivity, useDealStages } from '@/hooks/useDeals';
import type { Json } from '@/integrations/supabase/types';

interface DealActivitiesTimelineProps {
  activities: DealActivity[];
  isLoading: boolean;
  currency?: string;
}

const activityIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="h-4 w-4" />,
  stage_change: <ArrowRight className="h-4 w-4" />,
  value_change: <DollarSign className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  created: <PlusCircle className="h-4 w-4" />,
  won: <Trophy className="h-4 w-4 text-green-600" />,
  lost: <XCircle className="h-4 w-4 text-red-500" />,
};

const activityLabels: Record<string, string> = {
  note: 'Notatka',
  stage_change: 'Zmiana etapu',
  value_change: 'Zmiana wartości',
  call: 'Rozmowa',
  email: 'Email',
  meeting: 'Spotkanie',
  created: 'Utworzono deal',
  won: 'Deal wygrany',
  lost: 'Deal przegrany',
};

function getDetailsValue<T>(details: Json | null, key: string): T | undefined {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined;
  return (details as Record<string, unknown>)[key] as T | undefined;
}

export function DealActivitiesTimeline({ activities, isLoading, currency = 'PLN' }: DealActivitiesTimelineProps) {
  const { data: stages = [] } = useDealStages();

  const formatCurrency = (value: number) =>
    value.toLocaleString('pl-PL', { style: 'currency', currency });

  const getStageName = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage?.name || stageId;
  };

  const renderActivityDetails = (activity: DealActivity) => {
    const details = activity.details;

    switch (activity.activity_type) {
      case 'created': {
        const title = getDetailsValue<string>(details, 'title');
        const value = getDetailsValue<number>(details, 'value');
        return (
          <p className="text-sm text-muted-foreground mt-1">
            {title && <span className="font-medium text-foreground">{title}</span>}
            {value !== undefined && (
              <span className="ml-2">• {formatCurrency(value)}</span>
            )}
          </p>
        );
      }

      case 'stage_change': {
        const fromStageId = getDetailsValue<string>(details, 'from_stage_id') || activity.old_value;
        const toStageId = getDetailsValue<string>(details, 'to_stage_id') || activity.new_value;
        return (
          <p className="text-sm text-muted-foreground mt-1">
            <span className="line-through">{fromStageId && getStageName(fromStageId)}</span>
            {' → '}
            <span className="font-medium text-foreground">{toStageId && getStageName(toStageId)}</span>
          </p>
        );
      }

      case 'value_change': {
        const fromValue = getDetailsValue<number>(details, 'from_value');
        const toValue = getDetailsValue<number>(details, 'to_value');
        const curr = getDetailsValue<string>(details, 'currency') || currency;
        return (
          <p className="text-sm text-muted-foreground mt-1">
            <span className="line-through">
              {fromValue !== undefined && fromValue.toLocaleString('pl-PL', { style: 'currency', currency: curr })}
            </span>
            {' → '}
            <span className="font-medium text-foreground">
              {toValue !== undefined && toValue.toLocaleString('pl-PL', { style: 'currency', currency: curr })}
            </span>
          </p>
        );
      }

      case 'won': {
        const value = getDetailsValue<number>(details, 'value');
        return (
          <p className="text-sm text-green-600 mt-1 font-medium">
            🎉 {value !== undefined && formatCurrency(value)}
          </p>
        );
      }

      case 'lost': {
        const reason = getDetailsValue<string>(details, 'reason');
        return reason ? (
          <p className="text-sm text-muted-foreground mt-1">
            Powód: {reason}
          </p>
        ) : null;
      }

      default:
        // Fallback for old-style activities
        if (activity.old_value && activity.new_value) {
          return (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="line-through">{activity.old_value}</span>
              {' → '}
              <span className="font-medium text-foreground">{activity.new_value}</span>
            </p>
          );
        }
        if (activity.description) {
          return (
            <p className="text-sm text-muted-foreground mt-1">
              {activity.description}
            </p>
          );
        }
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historia aktywności
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Historia aktywności
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak aktywności
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="relative flex gap-4 pl-10">
                  {/* Icon */}
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    {activityIcons[activity.activity_type] || (
                      <Activity className="h-4 w-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {activityLabels[activity.activity_type] || activity.activity_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), 'd MMM yyyy, HH:mm', {
                          locale: pl,
                        })}
                      </span>
                    </div>

                    {renderActivityDetails(activity)}

                    {activity.creator && (
                      <p className="text-xs text-muted-foreground mt-1">
                        przez {activity.creator.full_name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}