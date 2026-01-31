import { LayoutGrid, Download, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface StructureToolbarProps {
  onAutoLayout: () => void;
  onExportPng: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  coverageOverlay: boolean;
  onCoverageOverlayChange: (enabled: boolean) => void;
}

export function StructureToolbar({
  onAutoLayout,
  onExportPng,
  onZoomIn,
  onZoomOut,
  coverageOverlay,
  onCoverageOverlayChange,
}: StructureToolbarProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAutoLayout}>
          <LayoutGrid className="h-4 w-4 mr-2" />
          Auto-Layout
        </Button>

        <div className="h-6 w-px bg-border mx-2" />

        <Button variant="outline" size="icon" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="coverage-overlay" className="text-sm cursor-pointer">
            Pokrycie polisą
          </Label>
          <Switch
            id="coverage-overlay"
            checked={coverageOverlay}
            onCheckedChange={onCoverageOverlayChange}
          />
        </div>

        <div className="h-6 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={onExportPng}>
          <Download className="h-4 w-4 mr-2" />
          Eksportuj PNG
        </Button>
      </div>
    </div>
  );
}
