import { Briefcase } from 'lucide-react';
import { PolicyPipelineDashboard } from '@/components/pipeline';

export default function PolicyPipeline() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ofertowanie</h1>
            <p className="text-sm text-muted-foreground">
              Zarządzaj procesem odnowień i monitoruj portfel polis
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <PolicyPipelineDashboard />
      </div>
    </div>
  );
}
