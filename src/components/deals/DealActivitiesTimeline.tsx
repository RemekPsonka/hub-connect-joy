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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DealActivity } from '@/hooks/useDeals';

interface DealActivitiesTimelineProps {
  activities: DealActivity[];
  isLoading: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  note: <MessageSquare className="h-4 w-4" />,
  stage_change: <ArrowRight className="h-4 w-4" />,
  value_change: <DollarSign className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

const activityLabels: Record<string, string> = {
  note: 'Notatka',
  stage_change: 'Zmiana etapu',
  value_change: 'Zmiana wartości',
  call: 'Rozmowa',
  email: 'Email',
  meeting: 'Spotkanie',
};

export function DealActivitiesTimeline({ activities, isLoading }: DealActivitiesTimelineProps) {
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

                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    )}

                    {activity.old_value && activity.new_value && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="line-through">{activity.old_value}</span>
                        {' → '}
                        <span className="font-medium text-foreground">
                          {activity.new_value}
                        </span>
                      </p>
                    )}

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
