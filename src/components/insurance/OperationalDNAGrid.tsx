import { Factory, Wrench, ShoppingCart, Globe, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypDzialnosci, TYPY_DZIALALNOSCI_LABELS } from './types';

interface OperationalDNAGridProps {
  selected: TypDzialnosci[];
  onChange: (selected: TypDzialnosci[]) => void;
}

const DNA_ITEMS: { type: TypDzialnosci; icon: typeof Factory }[] = [
  { type: 'produkcja', icon: Factory },
  { type: 'uslugi', icon: Wrench },
  { type: 'handel', icon: ShoppingCart },
  { type: 'import_export', icon: Globe },
  { type: 'ecommerce', icon: Monitor },
];

export function OperationalDNAGrid({ selected, onChange }: OperationalDNAGridProps) {
  const toggleType = (type: TypDzialnosci) => {
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">DNA Operacyjne</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {DNA_ITEMS.map(({ type, icon: Icon }) => {
          const isSelected = selected.includes(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-medium text-center">{TYPY_DZIALALNOSCI_LABELS[type]}</span>
              {isSelected && (
                <span className="text-xs text-primary">✓ Wybrano</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
