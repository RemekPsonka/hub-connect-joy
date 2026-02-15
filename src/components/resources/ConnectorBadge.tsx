import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, User } from 'lucide-react';
import { useDeleteConnector } from '@/hooks/useResources';
import { useNavigate } from 'react-router-dom';

const STRENGTH_COLORS: Record<string, string> = {
  direct: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  strong: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  moderate: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  weak: 'bg-muted text-muted-foreground border-border',
};

const STRENGTH_LABELS: Record<string, string> = {
  direct: 'Bezpośredni',
  strong: 'Silny',
  moderate: 'Umiarkowany',
  weak: 'Słaby',
};

interface ConnectorBadgeProps {
  connector: {
    id: string;
    strength: string;
    relationship_description: string | null;
    contact: { id: string; full_name: string; company: string | null; position: string | null } | null;
  };
}

export function ConnectorBadge({ connector }: ConnectorBadgeProps) {
  const del = useDeleteConnector();
  const navigate = useNavigate();
  if (!connector.contact) return null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${STRENGTH_COLORS[connector.strength] || STRENGTH_COLORS.moderate}`}>
      <button onClick={() => navigate(`/contacts/${connector.contact!.id}`)} className="flex items-center gap-1.5 hover:underline">
        <User className="h-3.5 w-3.5" />
        <span className="font-medium">{connector.contact.full_name}</span>
      </button>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{STRENGTH_LABELS[connector.strength] || connector.strength}</Badge>
      {connector.relationship_description && (
        <span className="text-xs opacity-70">— {connector.relationship_description}</span>
      )}
      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 hover:opacity-100" onClick={() => del.mutate(connector.id)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
