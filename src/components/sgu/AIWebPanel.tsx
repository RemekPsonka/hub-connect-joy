import { Globe } from 'lucide-react';
import { WebSourcesTable } from './WebSourcesTable';
import { ProspectingCandidatesList } from './ProspectingCandidatesList';

export function AIWebPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Prospecting web (RSS / HTML / API)</h3>
      </div>
      <WebSourcesTable />
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Kandydaci z web</h4>
        <ProspectingCandidatesList />
      </div>
    </div>
  );
}
