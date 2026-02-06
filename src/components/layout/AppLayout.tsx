import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';
import { Search, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SemanticSearchModal } from '@/components/search/SemanticSearchModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ReportBugButton } from '@/components/bugs/ReportBugButton';
import { RemekChatWidget } from '@/components/remek/RemekChatWidget';
import { useTheme } from '@/contexts/ThemeContext';

export function AppLayout() {
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header — sticky, blurred */}
          <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <Breadcrumbs />
            </div>
            
            {/* Search bar */}
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Szukaj... (⌘K)"
                  className="pl-8 bg-muted/50 cursor-pointer border-transparent hover:border-border focus:border-border transition-colors"
                  onClick={() => setIsSearchOpen(true)}
                  readOnly
                />
              </div>
            </div>
            
            {/* Right side */}
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
          
          {/* Main content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
      
      <SemanticSearchModal 
        open={isSearchOpen} 
        onOpenChange={setIsSearchOpen} 
      />
      
      <RemekChatWidget />
      <ReportBugButton />
    </SidebarProvider>
  );
}
