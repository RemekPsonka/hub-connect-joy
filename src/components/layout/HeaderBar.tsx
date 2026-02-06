import { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { CommandPalette } from './CommandPalette';
import { Search, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function HeaderBar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-4">
        {/* Left: sidebar trigger + breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger />
          <Breadcrumbs />
        </div>

        {/* Center: search trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 flex-1 max-w-md rounded-lg bg-muted/50 hover:bg-muted px-3 py-1.5 text-sm text-muted-foreground cursor-pointer border border-transparent hover:border-border transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Szukaj... (⌘K)</span>
        </button>

        {/* Right: theme toggle, notifications, user menu */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label="Przełącz motyw"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <CommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
