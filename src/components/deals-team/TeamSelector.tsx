import { Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DealTeamContactStats } from '@/types/dealTeam';

interface Team {
  id: string;
  name: string;
  color: string;
  description?: string | null;
}

interface TeamSelectorProps {
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  teams: Team[];
  contactStats?: DealTeamContactStats;
  onSettingsClick?: () => void;
}

export function TeamSelector({
  selectedTeamId,
  onTeamChange,
  teams,
  contactStats,
  onSettingsClick,
}: TeamSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedTeamId} onValueChange={onTeamChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Wybierz zespół..." />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span>{team.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {contactStats && selectedTeamId && (
        <div className="flex items-center gap-1">
          {contactStats.hot_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {contactStats.hot_count} 🔥
            </Badge>
          )}
          {contactStats.overdue_count > 0 && (
            <Badge variant="destructive" className="text-xs">
              {contactStats.overdue_count}
            </Badge>
          )}
        </div>
      )}

      {onSettingsClick && selectedTeamId && (
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
