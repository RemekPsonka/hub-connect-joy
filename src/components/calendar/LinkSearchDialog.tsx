import { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { CheckSquare, Users, FolderKanban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LinkSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: 'task' | 'contact' | 'project', id: string, name: string) => void;
}

interface SearchResults {
  tasks: Array<{ id: string; title: string }>;
  contacts: Array<{ id: string; full_name: string }>;
  projects: Array<{ id: string; name: string }>;
}

export function LinkSearchDialog({ open, onOpenChange, onSelect }: LinkSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ tasks: [], contacts: [], projects: [] });
  const [isSearching, setIsSearching] = useState(false);

  const runSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ tasks: [], contacts: [], projects: [] });
      return;
    }

    setIsSearching(true);
    const pattern = `%${searchQuery}%`;

    try {
      const [tasksRes, contactsRes, projectsRes] = await Promise.all([
        supabase.from('tasks').select('id, title').ilike('title', pattern).limit(5),
        supabase.from('contacts').select('id, full_name').ilike('full_name', pattern).limit(5),
        supabase.from('projects').select('id, name').ilike('name', pattern).limit(5),
      ]);

      setResults({
        tasks: tasksRes.data || [],
        contacts: contactsRes.data || [],
        projects: projectsRes.data || [],
      });
    } catch (error) {
      console.error('Link search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ tasks: [], contacts: [], projects: [] });
    }
  }, [open]);

  const handleSelect = (type: 'task' | 'contact' | 'project', id: string, name: string) => {
    onSelect(type, id, name);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Szukaj zadania, kontaktu lub projektu..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? 'Szukam...' : query.trim() ? 'Brak wyników' : 'Wpisz aby szukać...'}
        </CommandEmpty>

        {results.tasks.length > 0 && (
          <CommandGroup heading="Zadania">
            {results.tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.title}`}
                onSelect={() => handleSelect('task', task.id, task.title)}
                className="cursor-pointer"
              >
                <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{task.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.contacts.length > 0 && (
          <CommandGroup heading="Kontakty">
            {results.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.full_name}`}
                onSelect={() => handleSelect('contact', contact.id, contact.full_name)}
                className="cursor-pointer"
              >
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{contact.full_name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.projects.length > 0 && (
          <CommandGroup heading="Projekty">
            {results.projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.name}`}
                onSelect={() => handleSelect('project', project.id, project.name)}
                className="cursor-pointer"
              >
                <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
