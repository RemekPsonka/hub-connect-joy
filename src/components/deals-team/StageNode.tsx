import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export interface StageNodeData {
  label: string;
  icon: string;
  color: string;
  stageKey: string;
  isDefault: boolean;
  isSelected: boolean;
  kanbanType: string;
  parentStageKey?: string | null;
  [key: string]: unknown;
}

const TYPE_COLORS: Record<string, string> = {
  main: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sub: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  workflow: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export const StageNode = memo(function StageNode({ data, selected }: NodeProps) {
  const d = data as StageNodeData;
  const typeLabel = d.kanbanType === 'sub' && d.parentStageKey
    ? `sub: ${d.parentStageKey}`
    : d.kanbanType;

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-card shadow-sm min-w-[140px] text-center cursor-pointer transition-all',
        selected || d.isSelected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-primary/50',
        d.isDefault && 'ring-1 ring-green-500/50'
      )}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-primary" />
      <div className="flex items-center gap-2 justify-center">
        <span className="text-lg">{d.icon}</span>
        <span className="text-sm font-medium">{d.label}</span>
      </div>
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block', TYPE_COLORS[d.kanbanType] || 'bg-muted text-muted-foreground')}>
        {typeLabel}
      </span>
      {d.isDefault && (
        <span className="text-[10px] text-green-600 dark:text-green-400 block">domyślny</span>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-primary" />
    </div>
  );
});
