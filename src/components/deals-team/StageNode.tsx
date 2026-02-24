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
  [key: string]: unknown;
}

export const StageNode = memo(function StageNode({ data, selected }: NodeProps) {
  const d = data as StageNodeData;
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
      {d.isDefault && (
        <span className="text-[10px] text-green-600 dark:text-green-400">domyślny</span>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-primary" />
    </div>
  );
});
