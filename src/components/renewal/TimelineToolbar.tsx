import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, AlertTriangle, Moon, Sun } from 'lucide-react';
import type { TimeViewMode } from './types';

interface TimelineToolbarProps {
  viewMode: TimeViewMode;
  onViewModeChange: (mode: TimeViewMode) => void;
  showCriticalPath: boolean;
  onCriticalPathChange: (show: boolean) => void;
  darkMode: boolean;
  onDarkModeChange: (dark: boolean) => void;
  criticalCount: number;
  onAddPolicy: () => void;
}

export function TimelineToolbar({
  viewMode,
  onViewModeChange,
  showCriticalPath,
  onCriticalPathChange,
  darkMode,
  onDarkModeChange,
  criticalCount,
  onAddPolicy,
}: TimelineToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 border-b bg-card rounded-t-lg">
      <Button onClick={onAddPolicy} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Dodaj polisę
      </Button>

      <div className="flex items-center gap-2">
        <Label htmlFor="view-mode" className="text-sm text-muted-foreground">
          Widok:
        </Label>
        <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as TimeViewMode)}>
          <SelectTrigger id="view-mode" className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="months">Miesiące</SelectItem>
            <SelectItem value="quarters">Kwartały</SelectItem>
            <SelectItem value="semesters">Półrocza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="critical-path"
          checked={showCriticalPath}
          onCheckedChange={onCriticalPathChange}
        />
        <Label 
          htmlFor="critical-path" 
          className="text-sm flex items-center gap-1.5 cursor-pointer"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Critical Path
          {criticalCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
              {criticalCount}
            </span>
          )}
        </Label>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Switch
          id="dark-mode"
          checked={darkMode}
          onCheckedChange={onDarkModeChange}
        />
        <Label htmlFor="dark-mode" className="text-sm cursor-pointer">
          {darkMode ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Label>
      </div>
    </div>
  );
}
