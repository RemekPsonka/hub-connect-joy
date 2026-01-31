import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Link2, Building2 } from 'lucide-react';
import type { SubsidiaryNodeData } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';

interface SubsidiaryNodeProps {
  data: SubsidiaryNodeData;
  selected?: boolean;
}

const ROLE_CONFIG = {
  subsidiary: { 
    icon: GitBranch, 
    label: 'Spółka zależna',
    bgClass: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    borderClass: 'border-blue-400'
  },
  affiliate: { 
    icon: Link2, 
    label: 'Stowarzyszona',
    bgClass: 'from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900',
    borderClass: 'border-slate-400'
  },
  branch: { 
    icon: Building2, 
    label: 'Oddział',
    bgClass: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
    borderClass: 'border-green-400'
  },
  parent: { 
    icon: Building2, 
    label: 'Spółka nadrzędna',
    bgClass: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
    borderClass: 'border-purple-400'
  },
};

function SubsidiaryNode({ data, selected }: SubsidiaryNodeProps) {
  const statusColor = STATUS_COLORS[data.insuranceStatus];
  const statusLabel = STATUS_LABELS[data.insuranceStatus];
  const isGap = data.insuranceStatus === 'gap';
  const config = ROLE_CONFIG[data.role] || ROLE_CONFIG.subsidiary;
  const Icon = config.icon;

  return (
    <div
      className={`
        relative min-w-[180px] p-3 rounded-lg shadow-md border-2 transition-all
        bg-gradient-to-br ${config.bgClass}
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isGap ? 'animate-pulse' : ''}
      `}
      style={{ borderColor: statusColor }}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white"
      />

      {/* Role indicator */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {config.label}
        </span>
      </div>

      {/* Company name */}
      <h3 className="font-semibold text-foreground text-sm leading-tight">
        {data.label}
      </h3>

      {/* Ownership percent */}
      {data.ownershipPercent !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">
          Udział: {data.ownershipPercent}%
        </p>
      )}

      {/* NIP */}
      {data.nip && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          NIP: {data.nip}
        </p>
      )}

      {/* Status badge */}
      <div 
        className="mt-2 flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 w-fit"
        style={{ 
          backgroundColor: `${statusColor}20`,
          color: statusColor 
        }}
      >
        <span 
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        {statusLabel}
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(SubsidiaryNode);
