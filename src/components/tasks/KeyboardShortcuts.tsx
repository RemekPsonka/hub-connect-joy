import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onNewTask: () => void;
  onViewChange: (view: 'list' | 'kanban' | 'table' | 'calendar') => void;
}

export function useTaskKeyboardShortcuts({ onNewTask, onViewChange }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewTask();
          break;
        case 'k':
          e.preventDefault();
          onViewChange('kanban');
          break;
        case 'l':
          e.preventDefault();
          onViewChange('list');
          break;
        case 't':
          e.preventDefault();
          onViewChange('table');
          break;
        case 'c':
          e.preventDefault();
          onViewChange('calendar');
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Szukaj"]');
          searchInput?.focus();
          break;
        case 'escape':
          (document.activeElement as HTMLElement)?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onNewTask, onViewChange]);
}
