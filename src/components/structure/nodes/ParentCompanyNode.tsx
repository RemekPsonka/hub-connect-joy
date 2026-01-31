import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Crown } from 'lucide-react';
import type { ParentCompanyNodeData, InsuranceStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';

interface ParentCompanyNodeProps {
  data: ParentCompanyNodeData;
  selected?: boolean;
}

function ParentCompanyNode({ data, selected }: ParentCompanyNodeProps) {
  const statusColor = STATUS_COLORS[data.insuranceStatus];
  const statusLabel = STATUS_LABELS[data.insuranceStatus];
  const isGap = data.insuranceStatus === 'gap';

  return (
    <div
      className={`
        relative min-w-[220px] p-4 rounded-xl shadow-lg border-2 transition-all
        bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isGap ? 'animate-pulse' : ''}
      `}
      style={{ borderColor: statusColor }}
    >
      {/* Crown icon */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 rounded-full p-1.5 shadow-md">
        <Crown className="h-4 w-4 text-amber-900" />
      </div>

      {/* Company name */}
      <div className="mt-2 text-center">
        <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-300 font-medium">
          Spółka Matka
        </span>
        <h3 className="font-bold text-foreground mt-1 text-sm leading-tight">
          {data.label}
        </h3>
      </div>

      {/* NIP */}
      {data.nip && (
        <p className="text-xs text-muted-foreground text-center mt-1">
          NIP: {data.nip}
        </p>
      )}

      {/* Status badge */}
      <div 
        className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1"
        style={{ 
          backgroundColor: `${statusColor}20`,
          color: statusColor 
        }}
      >
        <span 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        {statusLabel}
      </div>

      {/* Bottom handle for connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(ParentCompanyNode);
