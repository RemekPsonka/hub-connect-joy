import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DealTeamProspect, ProspectStatus } from '@/types/dealTeam';

interface ProspectCardProps {
  prospect: DealTeamProspect;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  low: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusSteps: ProspectStatus[] = [
  'searching',
  'found_connection',
  'intro_sent',
  'meeting_scheduled',
  'converted',
];

const statusLabels: Record<ProspectStatus, string> = {
  searching: 'Szukam',
  found_connection: 'Znaleziono',
  intro_sent: 'Intro',
  meeting_scheduled: 'Spotkanie',
  converted: 'Skonwertowano',
  cancelled: 'Anulowano',
};

export function ProspectCard({ prospect }: ProspectCardProps) {
  const handleConvert = () => {
    toast.info('Wkrótce — prompt 5.8');
  };

  const currentStepIndex = statusSteps.indexOf(prospect.status);

  return (
    <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        {/* Row 1: Name + priority */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{prospect.prospect_name}</p>
            {prospect.prospect_company && (
              <p className="text-xs text-muted-foreground truncate">
                {prospect.prospect_company}
              </p>
            )}
            {prospect.prospect_position && (
              <p className="text-xs text-muted-foreground truncate">
                {prospect.prospect_position}
              </p>
            )}
          </div>
          <Badge className={`text-xs shrink-0 ${priorityColors[prospect.priority]}`}>
            {prospect.priority}
          </Badge>
        </div>

        {/* Row 2: Assigned info */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          {prospect.assigned_director && (
            <p className="truncate">Szuka: {prospect.assigned_director.full_name}</p>
          )}
          {prospect.requested_by_director && (
            <p className="truncate">Dla: {prospect.requested_by_director.full_name}</p>
          )}
        </div>

        {/* Row 3: Status stepper */}
        <div className="flex items-center gap-1">
          {statusSteps.slice(0, 4).map((step, index) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full ${
                index <= currentStepIndex ? 'bg-purple-500' : 'bg-muted'
              }`}
              title={statusLabels[step]}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{statusLabels[prospect.status]}</p>

        {/* Row 4: Convert button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs justify-start text-purple-600 hover:text-purple-700"
          onClick={handleConvert}
        >
          <ArrowRight className="h-3 w-3 mr-1" />
          Konwertuj do LEAD
        </Button>
      </CardContent>
    </Card>
  );
}
