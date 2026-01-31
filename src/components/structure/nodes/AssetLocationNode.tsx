import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Factory, Warehouse, Building, LandPlot, Package } from 'lucide-react';
import type { AssetLocationNodeData } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';

interface AssetLocationNodeProps {
  data: AssetLocationNodeData;
  selected?: boolean;
}

const TYPE_CONFIG = {
  factory: { icon: Factory, label: 'Fabryka', color: 'amber' },
  warehouse: { icon: Warehouse, label: 'Magazyn', color: 'emerald' },
  office: { icon: Building, label: 'Biuro', color: 'sky' },
  land: { icon: LandPlot, label: 'Działka', color: 'lime' },
  other: { icon: Package, label: 'Inne', color: 'slate' },
};

function AssetLocationNode({ data, selected }: AssetLocationNodeProps) {
  const statusColor = STATUS_COLORS[data.insuranceStatus];
  const statusLabel = STATUS_LABELS[data.insuranceStatus];
  const isGap = data.insuranceStatus === 'gap';
  const config = TYPE_CONFIG[data.type] || TYPE_CONFIG.other;
  const Icon = config.icon;

  return (
    <div
      className={`
        relative min-w-[140px] p-2.5 rounded-md shadow-sm border transition-all
        bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isGap ? 'animate-pulse' : ''}
      `}
      style={{ borderColor: statusColor }}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-amber-500 !border-2 !border-white"
      />

      {/* Type icon and label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`p-1 rounded bg-${config.color}-200 dark:bg-${config.color}-800`}>
          <Icon className="h-3 w-3 text-amber-700 dark:text-amber-300" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {config.label}
        </span>
      </div>

      {/* Location name */}
      <h4 className="font-medium text-foreground text-xs leading-tight">
        {data.label}
      </h4>

      {/* Address */}
      {data.address && (
        <p className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[130px]">
          {data.address}
        </p>
      )}

      {/* Status indicator */}
      <div 
        className="mt-1.5 flex items-center gap-1 text-[9px] font-medium"
        style={{ color: statusColor }}
      >
        <span 
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        {statusLabel}
      </div>
    </div>
  );
}

export default memo(AssetLocationNode);
