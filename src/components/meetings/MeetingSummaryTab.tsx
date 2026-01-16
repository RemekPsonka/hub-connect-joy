import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserCheck,
  UserPlus,
  Users2,
  Sparkles,
  Bell,
  FileText,
} from 'lucide-react';
import { useMeetingStats } from '@/hooks/useMeetings';

interface MeetingSummaryTabProps {
  meetingId: string;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function MeetingSummaryTab({ meetingId }: MeetingSummaryTabProps) {
  const stats = useMeetingStats(meetingId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Uczestników"
          value={stats.attendedParticipants}
          icon={Users}
          description={`z ${stats.totalParticipants} zaproszonych`}
        />

        <StatCard
          title="Moich członków"
          value={stats.memberParticipants}
          icon={UserCheck}
        />

        <StatCard
          title="Nowych kontaktów"
          value={stats.newContacts}
          icon={UserPlus}
        />

        <StatCard
          title="Spotkań 1x1"
          value={stats.totalOneOnOnes}
          icon={Users2}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Rekomendacji zaakceptowanych"
          value={stats.acceptedRecommendations}
          icon={Sparkles}
          description={`z ${stats.totalRecommendations} wygenerowanych`}
        />

        <StatCard
          title="Follow-upów do wykonania"
          value={stats.followUpsNeeded}
          icon={Bell}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Raport ze spotkania
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Wygeneruj szczegółowy raport ze spotkania zawierający wszystkie statystyki,
            listę uczestników, zrealizowane rekomendacje i spotkania 1x1.
          </p>
          <Button disabled className="gap-2">
            <FileText className="h-4 w-4" />
            Generuj raport (wkrótce)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
