import { User, Target, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResultProps {
  type: 'contact' | 'need' | 'offer';
  title: string;
  subtitle?: string;
  description?: string;
  similarity: number;
  onClick?: () => void;
  isSelected?: boolean;
}

const typeConfig = {
  contact: {
    icon: User,
    label: 'Kontakt',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  need: {
    icon: Target,
    label: 'Potrzeba',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  offer: {
    icon: Gift,
    label: 'Oferta',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  }
};

export function SearchResult({
  type,
  title,
  subtitle,
  description,
  similarity,
  onClick,
  isSelected
}: SearchResultProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const matchPercent = Math.round(similarity * 100);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-accent focus:bg-accent focus:outline-none',
        isSelected && 'bg-accent'
      )}
    >
      <div className={cn('p-2 rounded-md', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{title}</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            matchPercent >= 80 ? 'bg-green-500/10 text-green-600' :
            matchPercent >= 60 ? 'bg-yellow-500/10 text-yellow-600' :
            'bg-muted text-muted-foreground'
          )}>
            {matchPercent}%
          </span>
        </div>
        
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
            {description}
          </p>
        )}
      </div>
      
      <span className={cn('text-xs px-2 py-1 rounded-full', config.bgColor, config.color)}>
        {config.label}
      </span>
    </button>
  );
}
