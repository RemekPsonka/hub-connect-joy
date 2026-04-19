import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { KRSProspectingForm } from './KRSProspectingForm';
import { ProspectingJobProgress } from './ProspectingJobProgress';
import { ProspectingCandidatesList } from './ProspectingCandidatesList';
import { useProspectingJobs } from '@/hooks/useProspectingJobStatus';

export function AIKRSPanel() {
  const [formOpen, setFormOpen] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { data: jobs = [] } = useProspectingJobs();

  return (
    <div className="space-y-4">
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between rounded-lg p-4 h-auto">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Wyszukiwanie AI w KRS
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${formOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 border-t">
              <KRSProspectingForm onJobStarted={setSelectedJobId} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {jobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Ostatnie joby</h4>
          <div className="space-y-2">
            {jobs.slice(0, 10).map((j) => (
              <ProspectingJobProgress
                key={j.id}
                jobId={j.id}
                onShowCandidates={() => setSelectedJobId(j.id)}
                isSelected={selectedJobId === j.id}
              />
            ))}
          </div>
        </div>
      )}

      {selectedJobId && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Kandydaci</h4>
          <ProspectingCandidatesList jobId={selectedJobId} />
        </div>
      )}
    </div>
  );
}
