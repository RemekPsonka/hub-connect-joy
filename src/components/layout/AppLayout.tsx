import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserMenu } from './UserMenu';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <SidebarTrigger className="hidden md:flex" />
            </div>
            
            {/* Search bar */}
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Szukaj..."
                  className="pl-8 bg-muted/50"
                />
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
              <UserMenu />
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
