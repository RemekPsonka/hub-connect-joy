import { useState } from 'react';
import { Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProspectingImportDialog } from './ProspectingImportDialog';
import { ProspectingList } from './ProspectingList';

interface Props {
  teamId: string;
}

export function ProspectingTab({ teamId }: Props) {
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Lista Prospecting</h3>
        </div>
        <Button onClick={() => setShowImport(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Importuj listę
        </Button>
      </div>

      {/* List */}
      <ProspectingList teamId={teamId} />

      {/* Import Dialog */}
      <ProspectingImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        teamId={teamId}
      />
    </div>
  );
}
