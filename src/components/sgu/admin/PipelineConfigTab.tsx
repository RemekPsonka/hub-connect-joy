import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings2 } from 'lucide-react';
import { PipelineConfigurator } from '@/components/deals-team/PipelineConfigurator';

interface PipelineConfigTabProps {
  teamId: string | null;
  tenantId: string | null;
}

export function PipelineConfigTab({ teamId, tenantId }: PipelineConfigTabProps) {
  const [open, setOpen] = useState(false);

  if (!teamId || !tenantId) {
    return (
      <Alert>
        <AlertDescription>
          Konfigurator pipeline wymaga skonfigurowanego zespołu SGU oraz tenanta.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline SGU</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Wizualny edytor etapów lejka i dozwolonych przejść między nimi.
        </p>
        <Button onClick={() => setOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Otwórz konfigurator
        </Button>
        <PipelineConfigurator teamId={teamId} tenantId={tenantId} open={open} onOpenChange={setOpen} />
      </CardContent>
    </Card>
  );
}
