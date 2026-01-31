import { X, ExternalLink, Building2, MapPin, Percent, DollarSign, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import type { SelectedNodeInfo, InsuranceStatus } from './types';
import { STATUS_COLORS, STATUS_LABELS } from './types';

interface PropertiesSidebarProps {
  selectedNode: SelectedNodeInfo | null;
  onClose: () => void;
  onStatusChange?: (nodeId: string, status: InsuranceStatus) => void;
}

function formatRevenue(amount?: number): string {
  if (!amount) return 'Brak danych';
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} mld PLN`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} mln PLN`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)} tys. PLN`;
  }
  return `${amount} PLN`;
}

export function PropertiesSidebar({ selectedNode, onClose, onStatusChange }: PropertiesSidebarProps) {
  const navigate = useNavigate();

  if (!selectedNode) return null;

  const { id, type, data } = selectedNode;
  const statusColor = STATUS_COLORS[data.insuranceStatus as InsuranceStatus];

  const getCompanyId = () => {
    if (type === 'parent' && 'companyId' in data) return data.companyId;
    if (type === 'subsidiary' && 'linkedCompanyId' in data) return data.linkedCompanyId;
    return null;
  };

  const companyId = getCompanyId();

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-background border-l shadow-xl z-10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Właściwości podmiotu</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Entity name */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nazwa</Label>
          <p className="font-semibold text-lg mt-1">{data.label}</p>
        </div>

        <Separator />

        {/* Identifiers */}
        <div className="space-y-2">
          {'nip' in data && data.nip && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">NIP:</span>
              <span className="font-medium">{data.nip}</span>
            </div>
          )}
          {'krs' in data && data.krs && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">KRS:</span>
              <span className="font-medium">{data.krs}</span>
            </div>
          )}
          {'regon' in data && data.regon && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">REGON:</span>
              <span className="font-medium">{data.regon}</span>
            </div>
          )}
        </div>

        {/* Revenue */}
        {'revenue' in data && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Przychody:</span>
              <span className="font-medium">
                {formatRevenue(data.revenue)}
                {'revenueYear' in data && data.revenueYear && (
                  <span className="text-muted-foreground"> ({data.revenueYear})</span>
                )}
              </span>
            </div>
          </>
        )}

        {/* Ownership */}
        {'ownershipPercent' in data && data.ownershipPercent !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Udział w grupie:</span>
            <span className="font-medium">{data.ownershipPercent}%</span>
          </div>
        )}

        {/* Address for assets */}
        {'address' in data && data.address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Adres:</span>
            <span className="font-medium">{data.address}</span>
          </div>
        )}

        {/* Broker */}
        {'broker' in data && data.broker && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Broker:</span>
            <span className="font-medium">{data.broker}</span>
          </div>
        )}

        <Separator />

        {/* Insurance status */}
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">
            Status ubezpieczenia
          </Label>
          
          <div 
            className="p-3 rounded-lg mb-3 flex items-center gap-2"
            style={{ backgroundColor: `${statusColor}15` }}
          >
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span 
              className="font-medium text-sm"
              style={{ color: statusColor }}
            >
              {STATUS_LABELS[data.insuranceStatus as InsuranceStatus]}
            </span>
          </div>

          {onStatusChange && (
            <RadioGroup 
              value={data.insuranceStatus as string}
              onValueChange={(value) => onStatusChange(id, value as InsuranceStatus)}
              className="space-y-2"
            >
              {(Object.keys(STATUS_LABELS) as InsuranceStatus[]).map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <RadioGroupItem value={status} id={`status-${status}`} />
                  <Label 
                    htmlFor={`status-${status}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[status] }}
                    />
                    {STATUS_LABELS[status]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        {companyId && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/company/${companyId}`)}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Przejdź do firmy
          </Button>
        )}
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground"
          onClick={onClose}
        >
          Zamknij
        </Button>
      </div>
    </div>
  );
}
