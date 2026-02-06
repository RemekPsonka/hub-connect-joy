import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Users,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Search as SearchIcon,
  CheckSquare,
  Network,
  Settings,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  contacts: Array<{ id: string; full_name: string; company: string | null; email: string | null }>;
  companies: Array<{ id: string; name: string; city: string | null; industry: string | null }>;
  projects: Array<{ id: string; name: string; status: string | null }>;
}

const navigationItems = [
  { label: 'Dashboard', url: '/', icon: LayoutDashboard },
  { label: 'Kontakty', url: '/contacts', icon: Users },
  { label: 'Projekty', url: '/projects', icon: FolderKanban },
  { label: 'Zadania', url: '/tasks', icon: CheckSquare },
  { label: 'Sieć kontaktów', url: '/network', icon: Network },
  { label: 'Analityka', url: '/analytics', icon: BarChart3 },
  { label: 'Ustawienia', url: '/settings', icon: Settings },
  { label: 'AI Chat', url: '/ai', icon: MessageSquare },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ contacts: [], companies: [], projects: [] });
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ contacts: [], companies: [], projects: [] });
      return;
    }

    setIsSearching(true);
    const pattern = `%${searchQuery}%`;

    try {
      const [contactsRes, companiesRes, projectsRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, full_name, company, email')
          .ilike('full_name', pattern)
          .limit(5),
        supabase
          .from('companies')
          .select('id, name, city, industry')
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('projects')
          .select('id, name, status')
          .ilike('name', pattern)
          .limit(5),
      ]);

      setResults({
        contacts: contactsRes.data || [],
        companies: companiesRes.data || [],
        projects: projectsRes.data || [],
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ contacts: [], companies: [], projects: [] });
    }
  }, [open]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  const hasQuery = query.trim().length > 0;
  const hasResults = results.contacts.length > 0 || results.companies.length > 0 || results.projects.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Wpisz aby szukać..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? 'Szukam...' : 'Brak wyników'}
        </CommandEmpty>

        {/* Search results */}
        {hasQuery && results.contacts.length > 0 && (
          <CommandGroup heading="Kontakty">
            {results.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.full_name}`}
                onSelect={() => handleSelect(`/contacts/${contact.id}`)}
                className="cursor-pointer"
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{contact.full_name}</span>
                  {contact.company && (
                    <span className="text-xs text-muted-foreground">{contact.company}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasQuery && results.companies.length > 0 && (
          <CommandGroup heading="Firmy">
            {results.companies.map((company) => (
              <CommandItem
                key={company.id}
                value={`company-${company.name}`}
                onSelect={() => handleSelect(`/companies/${company.id}`)}
                className="cursor-pointer"
              >
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{company.name}</span>
                  {(company.city || company.industry) && (
                    <span className="text-xs text-muted-foreground">
                      {[company.city, company.industry].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasQuery && results.projects.length > 0 && (
          <CommandGroup heading="Projekty">
            {results.projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.name}`}
                onSelect={() => handleSelect(`/projects/${project.id}`)}
                className="cursor-pointer"
              >
                <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span>{project.name}</span>
                  {project.status && (
                    <Badge variant="secondary" className="text-[10px]">
                      {project.status}
                    </Badge>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation - always visible when no query */}
        {!hasQuery && (
          <>
            {hasResults && <CommandSeparator />}
            <CommandGroup heading="Nawigacja">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.url}
                    value={`nav-${item.label}`}
                    onSelect={() => handleSelect(item.url)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↑↓</kbd>
          nawiguj
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">↵</kbd>
          wybierz
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd>
          zamknij
        </span>
      </div>
    </CommandDialog>
  );
}
