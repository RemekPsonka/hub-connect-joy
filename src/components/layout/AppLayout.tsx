import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { HeaderBar } from './HeaderBar';
import { ReportBugButton } from '@/components/bugs/ReportBugButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SovraReminderAutoTrigger } from '@/components/sovra/SovraReminderAutoTrigger';
import { clearExpiredLogos } from '@/lib/logoCache';

export function AppLayout() {
  useEffect(() => {
    clearExpiredLogos();
  }, []);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderBar />
          
          {/* Main content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-background">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      
      <ReportBugButton />
      <SovraReminderAutoTrigger />
    </SidebarProvider>
  );
}
