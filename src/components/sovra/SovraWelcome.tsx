import { SovraAvatar } from './SovraAvatar';

interface QuickAction {
  emoji: string;
  title: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { emoji: '☀️', title: 'Poranny brief', prompt: 'Wygeneruj mój poranny brief' },
  { emoji: '📋', title: 'Moje priorytety', prompt: 'Jakie są moje priorytety na dziś?' },
  { emoji: '📊', title: 'Status projektów', prompt: 'Pokaż status moich projektów' },
  { emoji: '👤', title: 'Sugestie kontaktów', prompt: 'Kogo powinienem skontaktować w tym tygodniu?' },
];

interface SovraWelcomeProps {
  onQuickAction: (prompt: string) => void;
}

export function SovraWelcome({ onQuickAction }: SovraWelcomeProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <SovraAvatar size="lg" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-1">Cześć, jestem Sovra</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Twoja asystentka projektowa. Mogę pomóc z:
        </p>

        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.title}
              onClick={() => onQuickAction(action.prompt)}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all text-left group"
            >
              <span className="text-lg">{action.emoji}</span>
              <p className="text-sm font-medium text-foreground mt-1 group-hover:text-primary transition-colors">
                {action.title}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
