import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Search, 
  Trash2, 
  Loader2,
  AlertTriangle,
  Check,
  Building2,
  User
} from 'lucide-react';
import { ParsedContact } from '@/hooks/useAIImport';
import { cn } from '@/lib/utils';

interface ImportContactRowProps {
  contact: ParsedContact;
  index: number;
  groups: { id: string; name: string; color: string | null }[];
  defaultPositions: { id: string; name: string }[];
  defaultPosition: string;
  metSourceSuggestions: string[];
  onUpdate: (index: number, updates: Partial<ParsedContact>) => void;
  onRemove: (index: number) => void;
  onToggleSelect: (index: number) => void;
  onEnrichCompany: (index: number) => void;
  onEnrichPerson: (index: number) => void;
}

export function ImportContactRow({
  contact,
  index,
  groups,
  defaultPositions,
  defaultPosition,
  metSourceSuggestions,
  onUpdate,
  onRemove,
  onToggleSelect,
  onEnrichCompany,
  onEnrichPerson,
}: ImportContactRowProps) {
  const [isOpen, setIsOpen] = useState(false);

  const canEnrichCompany = !contact.company_nip && (contact.company || (contact.email && !isPersonalEmail(contact.email)));
  const canEnrichPerson = !contact.ai_person_info && contact.first_name && contact.last_name;
  const isEnrichingCompany = contact.status === 'enriching_company';
  const isEnrichingPerson = contact.status === 'enriching_person';

  const getStatusBadge = () => {
    switch (contact.status) {
      case 'duplicate':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Duplikat
          </Badge>
        );
      case 'enriching_company':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Firma...
          </Badge>
        );
      case 'enriching_person':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Osoba...
          </Badge>
        );
      case 'ready':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-300">
            <Check className="h-3 w-3 mr-1" />
            Gotowy
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">Błąd</Badge>
        );
      default:
        return (
          <Badge variant="secondary">Oczekuje</Badge>
        );
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "border-b last:border-0 hover:bg-muted/30 transition-colors",
        contact.status === 'duplicate' && "bg-amber-50/50 dark:bg-amber-950/20",
        !contact.selected && "opacity-60"
      )}>
        {/* Main row */}
        <div className="grid grid-cols-[40px_100px_1fr_1fr_1fr_140px_1fr_1fr_100px_40px] gap-2 py-2 px-2 items-center text-sm">
          <div className="flex justify-center">
            <Checkbox 
              checked={contact.selected} 
              onCheckedChange={() => onToggleSelect(index)}
            />
          </div>
          
          <div>{getStatusBadge()}</div>
          
          <div className="truncate font-medium">
            {contact.first_name || <span className="text-muted-foreground">-</span>}
          </div>
          
          <div className="truncate font-medium">
            {contact.last_name || <span className="text-muted-foreground">-</span>}
          </div>
          
          <div className="flex items-center gap-1 truncate">
            {contact.company ? (
              <span className="truncate">{contact.company}</span>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
            {contact.company_nip && (
              <Badge variant="outline" className="text-xs shrink-0">NIP</Badge>
            )}
            {canEnrichCompany && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => onEnrichCompany(index)}
                disabled={isEnrichingCompany}
                title="Pobierz dane firmy"
              >
                {isEnrichingCompany ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Building2 className="h-3 w-3 text-primary" />
                )}
              </Button>
            )}
          </div>
          
          <div>
            <Select
              value={contact.position || defaultPosition}
              onValueChange={(val) => onUpdate(index, { position: val })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {defaultPositions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.name}>
                    {pos.name}
                  </SelectItem>
                ))}
                {contact.position && !defaultPositions.find(p => p.name === contact.position) && (
                  <SelectItem value={contact.position}>
                    {contact.position}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-muted-foreground text-xs truncate">
            {contact.email || '-'}
          </div>
          
          <div className="text-muted-foreground text-xs truncate">
            {contact.phone || '-'}
          </div>
          
          <div className="flex items-center gap-1">
            {canEnrichPerson && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onEnrichPerson(index)}
                disabled={isEnrichingPerson}
                title="Sprawdź osobę w AI"
              >
                {isEnrichingPerson ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3 text-primary" />
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => onRemove(index)}
              title="Usuń z listy"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 bg-muted/30 space-y-4">
            {/* Individual settings */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Grupa docelowa</label>
                <Select
                  value={contact.group_id || 'none'}
                  onValueChange={(val) => onUpdate(index, { group_id: val === 'none' ? null : val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Domyślna..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Użyj domyślnej</span>
                    </SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: group.color || '#6366f1' }}
                          />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Skąd poznany?</label>
                <Input
                  placeholder="np. CC WAW 2025"
                  value={contact.met_source || ''}
                  onChange={(e) => onUpdate(index, { met_source: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data poznania</label>
                <Input
                  type="date"
                  value={contact.met_date || ''}
                  onChange={(e) => onUpdate(index, { met_date: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Komentarz</label>
                <Input
                  placeholder="Dodatkowe notatki..."
                  value={contact.comment || ''}
                  onChange={(e) => onUpdate(index, { comment: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Company data (if enriched) */}
            {contact.company_nip && (
              <div className="p-3 bg-background rounded-md border space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  Dane firmy
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">NIP:</span>{' '}
                    <span className="font-mono">{contact.company_nip}</span>
                  </div>
                  {contact.company_regon && (
                    <div>
                      <span className="text-muted-foreground">REGON:</span>{' '}
                      <span className="font-mono">{contact.company_regon}</span>
                    </div>
                  )}
                  {contact.company_city && (
                    <div>
                      <span className="text-muted-foreground">Miasto:</span>{' '}
                      {contact.company_city}
                    </div>
                  )}
                  {contact.company_industry && (
                    <div>
                      <span className="text-muted-foreground">Branża:</span>{' '}
                      {contact.company_industry}
                    </div>
                  )}
                </div>
                {contact.company_description && (
                  <p className="text-xs text-muted-foreground">{contact.company_description}</p>
                )}
              </div>
            )}

            {/* AI person info */}
            {contact.ai_person_info && (
              <div className="p-3 bg-background rounded-md border space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-primary" />
                  Informacje o osobie (AI)
                </div>
                <p className="text-xs text-muted-foreground">{contact.ai_person_info}</p>
                {contact.ai_person_position && (
                  <Badge variant="secondary" className="text-xs">
                    Sugerowane stanowisko: {contact.ai_person_position}
                  </Badge>
                )}
              </div>
            )}

            {/* Duplicate info */}
            {contact.status === 'duplicate' && contact.duplicate_info && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Znaleziono podobny kontakt w systemie
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs mb-3">
                  <div>
                    <p className="font-medium">{contact.duplicate_info.full_name}</p>
                    {contact.duplicate_info.email && (
                      <p className="text-muted-foreground">{contact.duplicate_info.email}</p>
                    )}
                    {contact.duplicate_info.company && (
                      <p className="text-muted-foreground">{contact.duplicate_info.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={contact.duplicate_decision === 'merge' ? 'default' : 'outline'}
                    className="text-xs h-7"
                    onClick={() => onUpdate(index, { duplicate_decision: 'merge', selected: true })}
                  >
                    Scal dane
                  </Button>
                  <Button
                    size="sm"
                    variant={contact.duplicate_decision === 'new' ? 'default' : 'outline'}
                    className="text-xs h-7"
                    onClick={() => onUpdate(index, { duplicate_decision: 'new', selected: true })}
                  >
                    Utwórz nowy
                  </Button>
                  <Button
                    size="sm"
                    variant={contact.duplicate_decision === 'skip' ? 'secondary' : 'outline'}
                    className="text-xs h-7"
                    onClick={() => onUpdate(index, { duplicate_decision: 'skip', selected: false })}
                  >
                    Pomiń
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Helper function
function isPersonalEmail(email: string | null): boolean {
  if (!email) return true;
  const personalDomains = [
    'gmail.com', 'wp.pl', 'o2.pl', 'onet.pl', 'interia.pl', 
    'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 
    'icloud.com', 'me.com', 'mail.com', 'protonmail.com',
    'tlen.pl', 'gazeta.pl', 'op.pl', 'poczta.fm'
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  return personalDomains.includes(domain);
}
