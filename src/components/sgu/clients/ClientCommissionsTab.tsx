import { CommissionsHeader } from '@/components/sgu/headers/CommissionsHeader';
import { CommissionsTab } from '@/components/deals-team/CommissionsTab';

interface Props {
  teamId: string;
}

export function ClientCommissionsTab({ teamId }: Props) {
  return (
    <div className="space-y-4">
      <CommissionsHeader teamId={teamId} />
      <CommissionsTab teamId={teamId} />
    </div>
  );
}
