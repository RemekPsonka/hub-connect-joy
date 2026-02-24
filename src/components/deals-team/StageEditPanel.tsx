import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { PipelineStage } from '@/hooks/usePipelineConfig';

const COLOR_PRESETS = [
  'border-t-slate-500', 'border-t-blue-500', 'border-t-green-500',
  'border-t-amber-500', 'border-t-purple-500', 'border-t-red-500',
  'border-t-cyan-500', 'border-t-pink-500',
];

const ICON_PRESETS = ['📋', '📅', '✅', '🔥', '⭐', '📝', '🤝', '📄', '💬', '🎉', '✖️', '❄️', '🚀', '🏆', '🔍', '📞', '📁'];

interface StageEditPanelProps {
  stage: PipelineStage;
  onSave: (updates: Partial<PipelineStage>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function StageEditPanel({ stage, onSave, onDelete, onClose }: StageEditPanelProps) {
  const [label, setLabel] = useState(stage.label);
  const [icon, setIcon] = useState(stage.icon);
  const [color, setColor] = useState(stage.color);
  const [isDefault, setIsDefault] = useState(stage.is_default);

  useEffect(() => {
    setLabel(stage.label);
    setIcon(stage.icon);
    setColor(stage.color);
    setIsDefault(stage.is_default);
  }, [stage]);

  const handleSave = () => {
    onSave({ label, icon, color, is_default: isDefault });
  };

  return (
    <div className="w-64 border-l bg-card p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Edycja etapu</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      <div className="space-y-2">
        <Label>Etykieta</Label>
        <Input value={label} onChange={e => setLabel(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Ikona</Label>
        <div className="flex flex-wrap gap-1">
          {ICON_PRESETS.map(i => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={`w-8 h-8 rounded text-lg flex items-center justify-center transition-all ${
                icon === i ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Kolor</Label>
        <div className="flex flex-wrap gap-1">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-t-4 ${c} transition-all ${
                color === c ? 'ring-2 ring-primary scale-110' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={isDefault}
          onCheckedChange={(v) => setIsDefault(!!v)}
          id="is-default"
        />
        <Label htmlFor="is-default" className="text-sm">Etap domyślny</Label>
      </div>

      <Separator />

      <div className="space-y-2">
        <Button onClick={handleSave} className="w-full" size="sm">
          Zapisz zmiany
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-2"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Usuń etap
        </Button>
      </div>
    </div>
  );
}
